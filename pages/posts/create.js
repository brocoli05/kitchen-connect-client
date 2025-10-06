import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { useEffect } from "react";
import TopNavBar from "@/components/TopNavBar";
import st from "@/styles/createPost.module.css";
import api from "../../utils/api";

export default function CreatePost() {
  const router = useRouter();

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
    const { title, content, photoFile } = data;

    try {
      const clientToken = localStorage.getItem("userToken");
      // If a file was selected, upload it first to get a URL
      let photoUrl = undefined;
      if (photoFile && photoFile.length > 0) {
        const fd = new FormData();
        fd.append("photo", photoFile[0]);
        const uploadResp = await fetch("/api/uploads", {
          method: "POST",
          headers: clientToken ? { Authorization: `Bearer ${clientToken}` } : undefined,
          body: fd,
        });
        if (!uploadResp.ok) {
          const err = await uploadResp.json().catch(() => ({}));
          throw new Error(err.message || "Upload failed");
        }
        const uploadData = await uploadResp.json();
        photoUrl = uploadData.url;
      }

      const payload = { title, content };
      if (photoUrl) payload.photo = photoUrl;

      const create = await api.post(
        "/posts/create",
        payload,
        { headers: { Authorization: `Bearer ${clientToken}` } }
      );
      router.push("/mainpage");
    } catch (error) {
      console.error("Failed to post", error.response ? error.response.data : error.message);
      const message = error.response && error.response.data ? (error.response.data.message || JSON.stringify(error.response.data)) : (error.message || 'Failed to post');
      alert(message);
    }
  };

  const cancelButton = () => {
    router.push("/mainpage");
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
        <br />
        <br />
        <br />
        Content: &nbsp; &nbsp; &nbsp; &nbsp;
        <textarea
          className={`${st.content} ${errors.content ? "inputError" : ""}`}
          placeholder="Here is a simple recipe to make a delicious meat lovers pizza: ..."
          {...register("content", { required: true })}
        />
        {errors.content?.type === "required" && (
          <span className={`${st.contentError} inputErrorText`}>
            This field is required
          </span>
        )}
        <br />
        <br />
        <div style={{ marginTop: 12 }}>
          <label htmlFor="photoFile">Photo (optional): </label>
          <input id="photoFile" type="file" accept="image/*" {...register("photoFile")} />
        </div>
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
