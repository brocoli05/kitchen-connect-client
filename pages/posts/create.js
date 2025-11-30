// pages/posts/create.js
import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import TopNavBar from "@/components/TopNavBar";
import st from "@/styles/createPost.module.css";
import api from "../../utils/api";
import RecipeTitleInput from "@/components/RecipeTitleInput";

export default function CreatePost() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [time, setTime] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [dietary, setDietary] = useState("");
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const titleValue = watch("title", "");

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    setSelectedImage(file || null);
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cancelButton = () => {
    router.push("/mainpage");
  };

  const submitForm = async (values) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", values.title.trim());
      formData.append("content", values.content.trim());
      if (time) formData.append("timeMax", time);
      formData.append("difficulty", difficulty ?? "");
      formData.append("dietary", dietary ?? "");
      formData.append("includeIngredients", include ?? "");
      formData.append("excludeIngredients", exclude ?? "");

      if (selectedImage) {
        formData.append("photo", selectedImage);
      }

      await api.post("/posts/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      router.push("/mainpage");
    } catch (error) {
      console.error("Failed to create post", error);
      alert(error?.response?.data?.message || "Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <TopNavBar />
      <main className={st.shell}>
        <header className={st.hero}>
          <p className={st.kicker}>Create</p>
          <h1>Share your next kitchen story</h1>
          <p>
            Capture the ingredients, memories, and tips that make your recipe special.
            Thoughtful details help the community recreate it with confidence.
          </p>
        </header>

        <form onSubmit={handleSubmit(submitForm)} className={st.card}>
          <section className={st.section}>
            <div className={st.sectionHeader}>
              <h2>Recipe basics</h2>
              <p>Start with a title and a rich description so cooks know what to expect.</p>
            </div>

            <div className={st.field}>
              <label className={st.label} htmlFor="recipeTitle">
                Recipe title
              </label>
              <RecipeTitleInput
                value={titleValue}
                onSelect={async (selection) => {
                  if (!selection) return;
                  const title =
                    typeof selection === "string" ? selection : selection.title;
                  setValue("title", title, { shouldDirty: true });

                  const id =
                    typeof selection === "object" && selection.id
                      ? selection.id
                      : null;
                  if (!id) return;

                  try {
                    const res = await fetch(
                      `/api/recipes/${encodeURIComponent(id)}`
                    );
                    if (!res.ok) return;
                    const info = await res.json();

                    const ingredients = (
                      info.extendedIngredients || info.ingredients || []
                    )
                      .map((ing) => {
                        const amt =
                          ing.amount ||
                          (ing.measures &&
                            ing.measures.us &&
                            ing.measures.us.amount) ||
                          "";
                        const unit =
                          ing.unit ||
                          (ing.measures &&
                            ing.measures.us &&
                            ing.measures.us.unitShort) ||
                          "";
                        const name = ing.name || ing.original || "";
                        return `- ${amt} ${unit} ${name}`
                          .replace(/\s+/g, " ")
                          .trim();
                      })
                      .join("\n");

                    let steps = [];
                    if (
                      Array.isArray(info.analyzedInstructions) &&
                      info.analyzedInstructions.length > 0
                    ) {
                      info.analyzedInstructions.forEach((section) => {
                        if (Array.isArray(section.steps)) {
                          section.steps.forEach((s) => {
                            if (s.step) steps.push(s.step);
                            else if (s.description) steps.push(s.description);
                          });
                        }
                      });
                    }

                    if (steps.length === 0 && info.instructions) {
                      steps = info.instructions
                        .split(/\r?\n|\. +/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((s) => (s.endsWith(".") ? s : `${s}.`));
                    }

                    const stepsFormatted = steps
                      .map((s, i) => `${i + 1}. ${s}`)
                      .join("\n\n");

                    const formatted = `Ingredients:\n${
                      ingredients || "N/A"
                    }\n\nInstructions:\n${stepsFormatted || "N/A"}`;
                    setValue("content", formatted, { shouldDirty: true });

                // --- Autofill constraints from recipe details (non-destructive) ---
                // Cooking Time
                if (!time && typeof info.readyInMinutes === "number" && info.readyInMinutes > 0) {
                  const minutes = String(info.readyInMinutes);
                  setTime(minutes);
                  setValue("time", minutes, { shouldDirty: true });
                }

                // Difficulty based on step count
                const stepCount = Array.isArray(steps) ? steps.length : 0;
                if (!difficulty && stepCount > 0) {
                  const autoDiff = stepCount <= 4 ? "Easy" : stepCount <= 8 ? "Medium" : "Hard";
                  setDifficulty(autoDiff);
                  setValue("difficulty", autoDiff, { shouldDirty: true });
                }

                // Dietary tags from booleans
                if (!dietary) {
                  const tags = [];
                  if (info.vegan) tags.push("vegan");
                  if (info.vegetarian) tags.push("vegetarian");
                  if (info.glutenFree) tags.push("gluten-free");
                  if (info.dairyFree) tags.push("dairy-free");
                  if (info.ketogenic) tags.push("keto");
                  if (info.veryHealthy) tags.push("healthy");
                  if (tags.length) {
                    const tagStr = tags.join(", ");
                    setDietary(tagStr);
                    setValue("dietary", tagStr, { shouldDirty: true });
                  }
                }

                // Include ingredients from ingredient names
                if (!include) {
                  const ingNames = (info.extendedIngredients || info.ingredients || [])
                    .map((ing) => ing.name || ing.originalName || ing.original || "")
                    .filter(Boolean);
                  if (ingNames.length) {
                    const includeStr = Array.from(new Set(ingNames)).join(", ");
                    setInclude(includeStr);
                    setValue("include", includeStr, { shouldDirty: true });
                  }
                }
                  } catch (err) {
                    console.error("Failed to fetch recipe details", err);
                  }
                }}
                placeholder="Homemade Meat Lovers Pizza"
                className={st.inputControl}
                inputProps={{ id: "recipeTitle" }}
              />
              <input
                type="hidden"
                {...register("title", { required: true, maxLength: 35 })}
              />
              {errors.title?.type === "required" && (
                <span className={st.error}>This field is required</span>
              )}
              {errors.title?.type === "maxLength" && (
                <span className={st.error}>
                  Title cannot contain more than 35 characters
                </span>
              )}
            </div>

            <div className={st.field}>
              <label className={st.label} htmlFor="story">
                Story & instructions
              </label>
              <textarea
                id="story"
                className={`${st.inputControl} ${st.textArea}`}
                placeholder="Here is a simple recipe to make a delicious meat lovers pizza..."
                {...register("content", { required: true })}
                rows={8}
              />
              {errors.content?.type === "required" && (
                <span className={st.error}>This field is required</span>
              )}
            </div>
          </section>

          <section className={st.section}>
            <div className={st.sectionHeader}>
              <h2>Cooking details</h2>
              <p>Help others plan by sharing timing, difficulty, and dietary needs.</p>
            </div>

            <div className={st.gridTwo}>
              <div className={st.field}>
                <label className={st.label} htmlFor="time">
                  Cooking time (minutes)
                </label>
                <input
                  id="time"
                  type="number"
                  min="0"
                  placeholder="e.g., 30"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={st.inputControl}
                />
              </div>

              <div className={st.field}>
                <label className={st.label} htmlFor="difficulty">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className={st.inputControl}
                >
                  <option value="">Select difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className={st.gridTwo}>
              <div className={st.field}>
                <label className={st.label} htmlFor="dietary">
                  Dietary tags
                </label>
                <input
                  id="dietary"
                  type="text"
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  placeholder="e.g., vegan, halal"
                  className={st.inputControl}
                />
              </div>

              <div className={st.field}>
                <label className={st.label} htmlFor="include">
                  Include ingredients
                </label>
                <input
                  id="include"
                  type="text"
                  value={include}
                  onChange={(e) => setInclude(e.target.value)}
                  placeholder="e.g., chicken, cheese"
                  className={st.inputControl}
                />
              </div>
            </div>

            <div className={st.gridTwo}>
              <div className={st.field}>
                <label className={st.label} htmlFor="exclude">
                  Exclude ingredients
                </label>
                <input
                  id="exclude"
                  type="text"
                  value={exclude}
                  onChange={(e) => setExclude(e.target.value)}
                  placeholder="e.g., nuts, gluten"
                  className={st.inputControl}
                />
              </div>
            </div>
          </section>

          <section className={st.section}>
            <div className={st.sectionHeader}>
              <h2>Cover photo</h2>
              <p>Optional, but highly recommended. Square or landscape images work best.</p>
            </div>

            <div className={st.uploadCard}>
              <input
                ref={fileInputRef}
                type="file"
                id="imageUpload"
                accept="image/*"
                onChange={handleImageChange}
                className={st.uploadInput}
              />
              <label htmlFor="imageUpload" className={st.uploadLabel}>
                <span>Upload photo</span>
                <small>PNG or JPG up to 5MB</small>
              </label>

              {selectedImage && (
                <div className={st.uploadMeta}>
                  <span>✓ {selectedImage.name}</span>
                  <button type="button" onClick={removeImage}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          </section>

          <div className={st.buttonRow}>
            <button
              className={`${st.button} ${st.buttonGhost}`}
              type="button"
              onClick={cancelButton}
            >
              Cancel
            </button>

            <button
              className={`${st.button} ${st.buttonPrimary}`}
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Publishing..." : "Publish post"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}