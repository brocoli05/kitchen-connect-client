// pages/api/users/suggested/posts.js
import clientPromise from "../../../../lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const MAX_HISTORY_SAMPLE = 35;

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const tokenize = (value) => {
  if (!value) return [];
  return String(value)
    .split(/[^a-zA-Z0-9]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length >= 3);
};

const shuffle = (array) => {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof ObjectId) return value;
  if (typeof value === "string" && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }
  return null;
};

const buildScorer = ({
  dietaryPrefs = [],
  difficultyPrefs = [],
  tagPrefs = [],
  includePrefs = [],
  ingredientTokens = [],
  keywordSeeds = [],
}) => {
  const dietarySet = new Set(dietaryPrefs.map((v) => v?.toLowerCase()).filter(Boolean));
  const difficultySet = new Set(
    difficultyPrefs.map((v) => v?.toLowerCase()).filter(Boolean)
  );
  const tagSet = new Set(tagPrefs.map((v) => v?.toLowerCase()).filter(Boolean));
  const includeSet = new Set(
    includePrefs.map((v) => v?.toLowerCase()).filter(Boolean)
  );

  const ingredientRegexes = ingredientTokens.map(
    (token) => new RegExp(`\\b${escapeRegex(token)}\\b`, "i")
  );
  const keywordRegexes = keywordSeeds.map(
    (token) => new RegExp(`\\b${escapeRegex(token)}\\b`, "i")
  );

  return (doc) => {
    let score = 0;
    const title = doc.title || "";
    const content = doc.content || "";
    const includeIngredients = Array.isArray(doc.includeIngredients)
      ? doc.includeIngredients
      : [];
    const tags = Array.isArray(doc.tags) ? doc.tags : [];

    ingredientRegexes.forEach((regex) => {
      const inTitle = regex.test(title);
      const inIngredients = includeIngredients.some((ing) =>
        regex.test(ing || "")
      );
      if (inTitle) score += 12; // prioritize ingredient match in title
      if (inIngredients) score += 8;
      if (!inTitle && !inIngredients && regex.test(content)) score += 2;
    });

    keywordRegexes.forEach((regex) => {
      if (regex.test(title)) score += 1.5;
      else if (regex.test(content)) score += 0.5;
    });

    if (dietarySet.has((doc.dietary || "").toLowerCase())) score += 0.75;
    if (difficultySet.has((doc.difficulty || "").toLowerCase())) score += 0.5;

    if (
      includeIngredients.some((ing) => includeSet.has((ing || "").toLowerCase()))
    ) {
      score += 1;
    }

    if (tags.some((tag) => tagSet.has((tag || "").toLowerCase()))) {
      score += 0.5;
    }

    return score;
  };
};

const rankWithNoise = (docs, scorer) =>
  docs
    .map((doc) => ({
      doc,
      score: scorer ? scorer(doc) : 0,
      noise: Math.random(),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.noise - b.noise;
    })
    .map((entry) => entry.doc);

const normalizePost = (doc) => ({
  id: doc.id ?? String(doc._id),
  title: doc.title ?? "",
  content: doc.content ?? "",
  excerpt:
    doc.excerpt ??
    (doc.content ? String(doc.content).slice(0, 140) : ""),
  authorId: doc.authorId ?? doc.userId ?? null,
  createdAt: doc.createdAt ?? null,
  photo: doc.photo ?? null,
  dietary: doc.dietary ?? "",
  difficulty: doc.difficulty ?? "",
  timeMax: doc.timeMax ?? null,
});

const topValues = (values, limit) => {
  const counts = new Map();
  values.forEach((val) => {
    if (!val || (typeof val === "string" && !val.trim())) return;
    const key = typeof val === "string" ? val.trim() : val;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
};

const trendingQuery = async (posts, limit, excludeSet = new Set()) => {
  const excludeIds = Array.from(excludeSet)
    .map(toObjectId)
    .filter(Boolean);

  const match = excludeIds.length ? { _id: { $nin: excludeIds } } : {};
  const extra = Math.max(limit * 3, limit);
  const docs = await posts
    .find(match)
    .sort({ likeCount: -1, createdAt: -1 })
    .limit(extra)
    .toArray();
  return shuffle(docs).slice(0, limit);
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const limit = Math.max(1, Math.min(12, parseInt(req.query.limit || "4", 10)));
  const token = req.headers.authorization?.split(" ")[1];

  let decoded = null;
  if (token) {
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      decoded = null;
    }
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "kitchen-connect");
    const posts = db.collection("posts");
    const users = db.collection("users");

    let personalizationEnabled = true;
    let personalizationActive = false;
    let personalizationReason = null;
    let personalizedItems = [];
    const excludeSet = new Set();
    let preferenceContext = {
      dietaryPrefs: [],
      difficultyPrefs: [],
      includePrefs: [],
      tagPrefs: [],
      ingredientTokens: [],
      keywordSeeds: [],
    };
    let scorer = null;

    if (decoded?.userId) {
      const userId = new ObjectId(decoded.userId);
      const userDoc = await users.findOne(
        { _id: userId },
        {
          projection: {
            personalization: 1,
            history: { $slice: MAX_HISTORY_SAMPLE },
            searchHistory: { $slice: MAX_HISTORY_SAMPLE },
            favoritePosts: 1,
          },
        }
      );

      personalizationEnabled = userDoc?.personalization?.enabled !== false;

      if (personalizationEnabled) {
        const historyEntries = Array.isArray(userDoc?.history)
          ? userDoc.history
          : [];
        const favoriteIds = Array.isArray(userDoc?.favoritePosts)
          ? userDoc.favoritePosts
          : [];
        const searchTerms = Array.isArray(userDoc?.searchHistory)
          ? userDoc.searchHistory.map((entry) => entry?.query).filter(Boolean)
          : [];

        const interactedIds = [
          ...historyEntries
            .map((item) => item?.postId)
            .filter(Boolean),
          ...favoriteIds,
        ]
          .map((id) => (id instanceof ObjectId ? id : toObjectId(id)))
          .filter(Boolean)
          .slice(0, MAX_HISTORY_SAMPLE);

        interactedIds.forEach((id) => excludeSet.add(String(id)));

        const interestPosts = interactedIds.length
          ? await posts
              .find(
                { _id: { $in: interactedIds } },
                {
                  projection: {
                    dietary: 1,
                    difficulty: 1,
                    includeIngredients: 1,
                    tags: 1,
                    title: 1,
                  },
                }
              )
              .toArray()
          : [];

        const dietaryPrefs = topValues(
          interestPosts.map((p) => p.dietary).filter(Boolean),
          4
        );
        const difficultyPrefs = topValues(
          interestPosts.map((p) => p.difficulty).filter(Boolean),
          3
        );
        const includePrefs = topValues(
          interestPosts.flatMap((p) =>
            Array.isArray(p.includeIngredients) ? p.includeIngredients : []
          ),
          6
        );
        const tagPrefs = topValues(
          interestPosts.flatMap((p) =>
            Array.isArray(p.tags) ? p.tags : []
          ),
          6
        );
        const ingredientTokens = topValues(
          includePrefs.flatMap((value) => tokenize(value)),
          8
        );
        const keywordSeeds = topValues(
          [
            ...searchTerms.flatMap((term) => tokenize(term)),
            ...interestPosts.flatMap((p) => tokenize(p.title)),
            ...ingredientTokens,
          ],
          10
        );
        preferenceContext = {
          dietaryPrefs,
          difficultyPrefs,
          includePrefs,
          tagPrefs,
          ingredientTokens,
          keywordSeeds,
        };
        scorer = buildScorer(preferenceContext);

        const orClauses = [];
        if (dietaryPrefs.length) {
          orClauses.push({ dietary: { $in: dietaryPrefs } });
        }
        if (difficultyPrefs.length) {
          orClauses.push({ difficulty: { $in: difficultyPrefs } });
        }
        if (includePrefs.length) {
          orClauses.push({ includeIngredients: { $in: includePrefs } });
        }
        if (tagPrefs.length) {
          orClauses.push({ tags: { $in: tagPrefs } });
        }
        keywordSeeds.forEach((term) => {
          const regex = new RegExp(escapeRegex(term), "i");
          orClauses.push({ title: { $regex: regex } });
          orClauses.push({ content: { $regex: regex } });
        });

        if (orClauses.length) {
          personalizationActive = true;

          const excludeIds = Array.from(excludeSet)
            .map(toObjectId)
            .filter(Boolean);

          const matchStages = [];
          if (excludeIds.length) matchStages.push({ _id: { $nin: excludeIds } });
          matchStages.push({ $or: orClauses });

          const personalizedMatch =
            matchStages.length > 1
              ? { $and: matchStages }
              : matchStages[0];

          personalizedItems = await posts
            .find(personalizedMatch)
            .sort({ likeCount: -1, createdAt: -1 })
            .limit(limit * 2)
            .toArray();
          personalizedItems = rankWithNoise(
            personalizedItems,
            scorer || (() => 0)
          );
        } else {
          personalizationReason = "insufficient-data";
        }
      } else {
        personalizationReason = "disabled";
      }
    } else {
      personalizationReason = "no-token";
    }

    let results = [];
    let fallbackUsed = false;
    let personalizedCount = 0;
    if (personalizationActive && personalizedItems.length) {
      const seen = new Set();
      for (const doc of personalizedItems) {
        if (seen.size >= limit) break;
        const id = String(doc._id);
        if (excludeSet.has(id) || seen.has(id)) continue;
        seen.add(id);
        results.push(doc);
      }
      personalizedCount = results.length;
    }

    if (results.length < limit) {
      fallbackUsed = true;
      results = results.concat(
        await trendingQuery(
          posts,
          limit - results.length,
          new Set([...excludeSet, ...results.map((r) => String(r._id))])
        )
      );
    }

    const normalized = [];
    const seenOutput = new Set();
    results.forEach((doc) => {
      const key = String(doc._id);
      if (seenOutput.has(key)) return;
      seenOutput.add(key);
      normalized.push(normalizePost(doc));
    });

    const finalItems = rankWithNoise(
      normalized,
      scorer || (() => 0)
    ).slice(0, limit);

    const source = personalizationActive
      ? fallbackUsed
        ? personalizedCount > 0
          ? "mixed"
          : "trending"
        : "personalized"
      : "trending";

    return res.status(200).json({
      items: finalItems,
      meta: {
        limit,
        source,
        personalizationEnabled,
        personalizationActive:
          personalizationActive && personalizedCount > 0,
        fallbackApplied: fallbackUsed,
        reason: personalizationReason,
      },
    });
  } catch (error) {
    console.error("Suggested posts error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}