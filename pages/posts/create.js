import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import TopNavBar from "@/components/TopNavBar";
import st from "@/styles/createPost.module.css";
import api from "../../utils/api";
import { Row, Col } from "react-bootstrap";
import RecipeTitleInput from "@/components/RecipeTitleInput";

export default function CreatePost() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(null);

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
    },
  });

  const titleValue = watch("title");

  // When the post button is clicked
  const submitForm = async (data) => {
    const { title, content } = data;

    try {
      const clientToken = localStorage.getItem("userToken");
      
      // If there's an image, use FormData to send both text and binary data
      if (selectedImage) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('photo', selectedImage); // Send actual file
        
        const response = await fetch('/api/posts/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clientToken}`
          },
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Failed to create post');
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
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      
      setSelectedImage(file); // Store the actual file object
    }
  };

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null);
    
    // Clear the file input value so the same file can be selected again
    const fileInput = document.getElementById('imageUpload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <>
      <TopNavBar />
      <p className={st.page}>
        <b>Writing a Post</b>
      </p>

      <form onSubmit={handleSubmit(submitForm)} className={st.form}>
        {/* Use RecipeTitleInput which queries the existing /api/recipe-autocomplete route */}
        Title: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
        <RecipeTitleInput
          value={titleValue}
          onSelect={async (selection) => {
            // selection can be either a string (legacy) or an object { id, title }
            if (!selection) return;
            let title = typeof selection === 'string' ? selection : selection.title;
            setValue("title", title);

            // If we have an id, fetch full recipe details and populate content
            const id = typeof selection === 'object' && selection.id ? selection.id : null;
            if (id) {
              try {
                const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`);
                if (!res.ok) return;
                const info = await res.json();

                // Build content: Ingredients + Steps
                const ingredients = (info.extendedIngredients || info.ingredients || []).map((ing) => {
                  // Spoonacular extendedIngredients has amount, unit, name
                  const amt = ing.amount || (ing.measures && ing.measures.us && ing.measures.us.amount) || '';
                  const unit = ing.unit || (ing.measures && ing.measures.us && ing.measures.us.unitShort) || '';
                  const name = ing.name || ing.original || '';
                  return `- ${amt} ${unit} ${name}`.replace(/\s+/g, ' ').trim();
                }).join('\n');

                // instructions may be in analyzedInstructions (array of sections)
                let steps = [];
                if (Array.isArray(info.analyzedInstructions) && info.analyzedInstructions.length > 0) {
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
                  // split by line breaks or sentences heuristically
                  // Note: Avoids lookbehind for compatibility with older JS environments.
                  steps = info.instructions
                    .split(/\r?\n|\. +/)
                    .map(s => s.trim())
                    .filter(Boolean)
                    .map(s => s.endsWith('.') ? s : s + '.');
                }

                const stepsFormatted = steps.map((s, i) => `${i + 1}. ${s}`).join('\n\n');

                const formatted = `Ingredients:\n${ingredients || 'N/A'}\n\nInstructions:\n${stepsFormatted || 'N/A'}`;
                setValue('content', formatted);
              } catch (err) {
                console.error('Failed to fetch recipe details', err);
              }
            }
          }}
          placeholder="Homemade Meat Lovers Pizza"
		  className="title"
        />
        {/* Hidden input is registered so react-hook-form still validates the title */}
        <input type="hidden" {...register("title", { required: true, maxLength: 35 })} />
        {errors.title?.type === "required" && (
          <span className={`${st.titleError} inputErrorText`}>
            This field is required
          </span>
        )}
        {errors.title?.type === "maxLength" && (
          <span className={`${st.titleError2} inputErrorText`}>
            Title cannot contain more than 35 characters
          </span>
        )}
        
        {/* Image Upload Section*/}
        <Row className={st.imageUploadSection}>
          <Col md={3}>
            <label htmlFor="imageUpload">Add Photo (Optional):</label>
          </Col>
          <Col md={9}>
            <input
              type="file"
              id="imageUpload"
              accept="image/*"
              onChange={handleImageChange}
              style={{ margin: "10px 0", display: "block" }}
            />
            {/* Show selected file name and remove button */}
            {selectedImage && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ 
                  color: '#28a745', 
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  ✓ {selectedImage.name}
                </span>
                <button
                  type="button"
                  onClick={removeImage}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </Col>
        </Row>
        
<<<<<<< Updated upstream
=======

        <Row style={{ marginTop: "8px" }}>
        <Col style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label>Cooking Time (minutes)</label>
          <input
            type="number"
            min="0"
            placeholder="e.g., 30"
            value={time}
            onChange={(e) => { setTime(e.target.value);
              setValue("time", e.target.value, { shouldDirty: true });
            }}
            className={st.input}
          />
        </Col>
      </Row>
        {/* Difficulty / Dietary */}
        <Row>
          <Col style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label>Difficulty</label>
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
          </Col>
          <Col style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label>Dietary</label>
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
          </Col>
        </Row>

        {/* Include / Exclude Ingredients */}
        <Row style={{ marginTop: "8px" }}>
          <Col style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label>Include Ingredients</label>
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
          </Col>
          <Col style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label>Exclude Ingredients</label>
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
          </Col>
        </Row>

        {/* Hidden registered inputs */}
        <input type="hidden" {...register("time")} value={time} />
        <input type="hidden" {...register("difficulty")} value={difficulty} />
        <input type="hidden" {...register("dietary")} value={dietary} />
        <input type="hidden" {...register("include")} value={include} />
        <input type="hidden" {...register("exclude")} value={exclude} />

>>>>>>> Stashed changes
        <br />
        Content: &nbsp; &nbsp; &nbsp; &nbsp;
        <textarea
          className={`${st.content} ${errors.content ? "inputError" : ""}`}
          placeholder="Here is a simple recipe to make a delicious meat lovers pizza: ..."
          {...register("content", { required: true })}
          rows={6}
          style={{ resize: 'vertical', minHeight: '120px', maxHeight: '300px' }}
        />
        {errors.content?.type === "required" && (
          <span className={`${st.contentError} inputErrorText`}>
            This field is required
          </span>
        )}
        
        <br />
        <br />
        <div className={st.buttonGap}>
          <button
            className={st.cancelButton}
            type="button"
            onClick={cancelButton}
          >
            Cancel
          </button>

          <button className={st.submitButton} type="submit">
            Post
          </button>
        </div>
      </form>
    </>
  );
}
