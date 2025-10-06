import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import TopNavBar from "@/components/TopNavBar";
import st from "@/styles/createPost.module.css";
import api from "../../utils/api";
import { Row, Col } from "react-bootstrap";

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
  } = useForm({
    defaultValues: {
      title: "",
      content: "",
    },
  });

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
          { title, content },
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
        Title: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
        <textarea
          className={`${st.title} ${errors.title ? "inputError" : ""}`}
          placeholder="Homemade Meat Lovers Pizza"
          {...register("title", { required: true, maxLength: 35 })}
        />
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
