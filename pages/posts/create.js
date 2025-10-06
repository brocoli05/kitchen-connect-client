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
    const { title, content, photo } = data;

    try {
      const clientToken = localStorage.getItem("userToken");

      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      // photo from register returns FileList; react-hook-form returns FileList
      if (photo && photo.length > 0) {
        formData.append("photo", photo[0]);
      }

      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientToken}`,
        },
        body: formData,
      });

      if (res.ok) {
        router.push("/mainpage");
      } else {
        const err = await res.json();
        console.error("Failed to post", err);
      }
    } catch (error) {
      console.error("Failed to post", error);
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
          <label>Photo (optional)</label>
          <input type="file" accept="image/*" {...register("photo")} />
        </div>
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
