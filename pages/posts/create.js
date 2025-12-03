// pages/posts/create.js
import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import TopNavBar from "@/components/TopNavBar";
import st from "@/styles/createPost.module.css";
import api from "../../utils/api";
import RecipeTitleInput from "@/components/RecipeTitleInput";

export default function CreatePost() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(null);

  // New fields
  const [time, setTime] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [dietary, setDietary] = useState("");
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");

  // secure protection to make sure unauthenticated user can't come to the page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const clientToken = localStorage.getItem("userToken");
      if (!clientToken) {
        router.push("/login");
      }
    }
  }, [router]);


  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      title: "",
      content: "",
      time: "",            
      difficulty: "",      
      dietary: "",         
      include: "",         
      exclude: "",         
    },
  });

  const titleValue = watch("title");

  // When the post button is clicked
  const submitForm = async (data) => {
    const { title, content, time, difficulty, dietary, include, exclude } = data;

    try {
      const clientToken = localStorage.getItem("userToken");

      // If there's an image, use FormData to send both text and binary data
      if (selectedImage) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('photo', selectedImage); // Send actual file
        formData.append('timeMax', time);
        formData.append('difficulty', difficulty);
        formData.append('dietary', dietary);
        formData.append('includeIngredients', include);
        formData.append('excludeIngredients', exclude);
        
        const response = await fetch('/api/posts/create', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clientToken}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to create post");
        }
      } else {
        // No image - use regular JSON approach
        const create = await api.post(
          "/posts/create",
          {
            title,
            content,
            timeMax: Number(time) || 0,
            difficulty,
            dietary,
            includeIngredients: include,
            excludeIngredients: exclude,
          },
          { headers: { Authorization: `Bearer ${clientToken}` } }
        );
      }

      router.push("/mainpage");
    } catch (error) {
      console.error(
        "Failed to post",
        error.response ? error.response.data : error.message
      );
    }
  };

  const cancelButton = () => {
    router.push("/mainpage");
  };

  // Handle image selection - simplified without preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }

      setSelectedImage(file); // Store the actual file object
    }
  };

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null);

    // Clear the file input value so the same file can be selected again
    const fileInput = document.getElementById("imageUpload");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <>
      <TopNavBar />
      <main className={st.page}>
        <form onSubmit={handleSubmit(submitForm)} className={st.form}>
          <header className={st.pageHeader}>
            <div>
              <p className={st.eyebrow}>Create Post</p>
              <h1 className={st.pageTitle}>Share your next recipe</h1>
              <p className={st.pageSubtitle}>
                Capture the story, ingredients, and steps so the community can cook along.
              </p>
            </div>
            <div className={st.headerActions}>
              <button
                type="button"
                className={`${st.button} ${st.secondaryButton}`}
                onClick={cancelButton}
              >
                Discard
              </button>
            </div>
          </header>

          <section className={st.section}>
            <div className={st.sectionHeading}>
              <h2>Recipe Overview</h2>
              <p>Start with a compelling title and an appetizing cover photo.</p>
            </div>
            <div className={st.fieldStack}>
              <div className={st.fieldGroup}>
                <label className={st.fieldLabel}>Recipe title</label>
                <RecipeTitleInput
                  value={titleValue}
                  onSelect={async (selection) => {
            // selection can be either a string (legacy) or an object { id, title }
            if (!selection) return;
            let title =
              typeof selection === "string" ? selection : selection.title;
            setValue("title", title);

            // If we have an id, fetch full recipe details and populate content
            const id =
              typeof selection === "object" && selection.id
                ? selection.id
                : null;
            if (id) {
              try {
                const res = await fetch(
                  `/api/recipes/${encodeURIComponent(id)}`
                );
                if (!res.ok) return;
                const info = await res.json();

                // Build content: Ingredients + Steps
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

                // instructions may be in analyzedInstructions (array of sections)
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

                
                // fallback to plain instructions text
                if (steps.length === 0 && info.instructions) {
                  steps = info.instructions
                    .split(/\r?\n|\. +/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((s) => (s.endsWith(".") ? s : s + "."));
                }

                const stepsFormatted = steps
                  .map((s, i) => `${i + 1}. ${s}`)
                  .join("\n\n");

                const formatted = `Ingredients:\n${
                  ingredients || "N/A"
                }\n\nInstructions:\n${stepsFormatted || "N/A"}`;
                setValue("content", formatted);

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
            }
          }}
          placeholder="Homemade Meat Lovers Pizza"
          className={st.input}
        />
        <input
          type="hidden"
          {...register("title", { required: true, maxLength: 35 })}
        />
        {errors.title?.type === "required" && (
          <span className={st.errorText}>This field is required</span>
        )}
        {errors.title?.type === "maxLength" && (
          <span className={st.errorText}>
            Title cannot contain more than 35 characters
          </span>
        )}
              </div>

              <div className={st.uploadCard}>
                <div>
                  <label className={st.fieldLabel} htmlFor="imageUpload">
                    Cover photo (optional)
                  </label>
                  <p className={st.fieldHint}>JPG or PNG up to 5MB.</p>
                </div>
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={st.uploadInput}
                />
                {selectedImage && (
                  <div className={st.fileBadgeRow}>
                    <span className={st.fileBadge}>✓ {selectedImage.name}</span>
                    <button
                      type="button"
                      onClick={removeImage}
                      className={st.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={st.section}>
            <div className={st.sectionHeading}>
              <h2>Cooking Details</h2>
              <p>Help others understand the effort, dietary notes, and ingredients.</p>
            </div>
            <div className={st.metaGrid}>
              <div className={st.fieldGroup}>
                <label className={st.fieldLabel}>Cooking Time (minutes)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g., 30"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                    setValue("time", e.target.value, { shouldDirty: true });
                  }}
                  className={st.input}
                />
              </div>

              <div className={st.fieldGroup}>
                <label className={st.fieldLabel}>Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => {
                    setDifficulty(e.target.value);
                    setValue("difficulty", e.target.value, { shouldDirty: true });
                  }}
                  className={st.input}
                >
                  <option value="">Select difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className={st.fieldGroup}>
                <label className={st.fieldLabel}>Dietary Tags</label>
                <input
                  type="text"
                  value={dietary}
                  onChange={(e) => {
                    setDietary(e.target.value);
                    setValue("dietary", e.target.value, { shouldDirty: true });
                  }}
                  placeholder="e.g., vegan, halal"
                  className={st.input}
                />
                <p className={st.fieldHint}>Comma separated values.</p>
              </div>

              <div className={st.fieldGroup}>
                <label className={st.fieldLabel}>Include Ingredients</label>
                <input
                  type="text"
                  value={include}
                  onChange={(e) => {
                    setInclude(e.target.value);
                    setValue("include", e.target.value, { shouldDirty: true });
                  }}
                  placeholder="e.g., chicken, cheese"
                  className={st.input}
                />
                <p className={st.fieldHint}>What must be featured?</p>
              </div>

              <div className={st.fieldGroup}>
                <label className={st.fieldLabel}>Exclude Ingredients</label>
                <input
                  type="text"
                  value={exclude}
                  onChange={(e) => {
                    setExclude(e.target.value);
                    setValue("exclude", e.target.value, { shouldDirty: true });
                  }}
                  placeholder="e.g., nuts, gluten"
                  className={st.input}
                />
                <p className={st.fieldHint}>Call out allergens or preferences.</p>
              </div>
            </div>
          </section>

          <section className={st.section}>
            <div className={st.sectionHeading}>
              <h2>Method</h2>
              <p>Share the story, ingredients, and step-by-step instructions.</p>
            </div>
            <div className={st.fieldGroup}>
              <label className={st.fieldLabel}>Story & Instructions</label>
              <textarea
                className={`${st.textarea} ${errors.content ? st.hasError : ""}`}
                placeholder="Here is a simple recipe to make a delicious meat lovers pizza..."
                {...register("content", { required: true })}
                rows={6}
              />
              {errors.content?.type === "required" && (
                <span className={st.errorText}>This field is required</span>
              )}
            </div>
          </section>

          <input type="hidden" {...register("time")} value={time} />
          <input type="hidden" {...register("difficulty")} value={difficulty} />
          <input type="hidden" {...register("dietary")} value={dietary} />
          <input type="hidden" {...register("include")} value={include} />
          <input type="hidden" {...register("exclude")} value={exclude} />

          <div className={st.footerActions}>
            <button
              type="button"
              className={`${st.button} ${st.secondaryButton}`}
              onClick={cancelButton}
            >
              Cancel
            </button>
            <button type="submit" className={`${st.button} ${st.primaryButton}`}>
              Post Recipe
            </button>
          </div>
        </form>
      </main>
    </>
  );
}