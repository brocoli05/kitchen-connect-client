import { useForm } from "react-hook-form";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";


export default function CreatePost(){

    const {register, handleSubmit, setValue, formState: {errors}} = useForm({
        defaultValues:{
            title:"",
            content:""
        }
    })

    
    function submitForm(data) {
        console.log(data);
    }

    const router = useRouter();
    const cancelButton = () => {
        router.push('/');
    }

    return(
        <>
            <p style={{marginTop: '70px', marginLeft:'290px', fontSize: '18px'}}>
                <b>Writing a Post</b>
            </p>
            <form onSubmit={handleSubmit(submitForm)} style={{ marginTop: '40px', marginLeft: '290px'}}>
                Title: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 
                <textarea className={errors.title && "inputError"} placeholder= "Homemade Meat Lovers Pizza" 
                    style={{
                        color:'black',
                        backgroundColor: 'transparent', 
                        border: '1px solid #ccc', 
                        width: '910px', 
                        height: '40px', 
                        borderRadius: '8px',
                        paddingLeft: '10px',
                        paddingTop: '10px',
                        verticalAlign: 'top',
                        resize:'none'
                    }} 
                    {...register("title", { required: true, maxLength: 35 })}/>
                    {errors.title?.type === "required" && <span className="inputErrorText" style={{color: 'red', fontSize: '12px', marginTop: '5px', marginLeft: '100px', display: 'block'}}>This field is required</span>}
                    {errors.title?.type === "maxLength" && <span className="inputErrorText" style={{color: 'red', fontSize: '12px', marginTop: '5px', marginLeft: '75px', display: 'block'}}>Title cannot contain more than 35 characters</span>}<br /><br />
                <br/>
                Content: &nbsp; &nbsp; &nbsp; &nbsp;
          
                <textarea classname={errors.content && "inputError"} placeholder="Here is a simple recipe to make a delicious meat lovers pizza: ..."
                    style={{
                        color:'black',
                        backgroundColor: 'transparent', 
                        border: '1px solid #ccc', 
                        width: '910px', 
                        height: '560px', 
                        borderRadius: '8px',
                        paddingLeft: '10px',
                        paddingTop: '10px',
                        verticalAlign:'top',
                        resize:'none'
                    }}
                    {...register("content", {required: true})}/>
                    {errors.content?.type === "required" && <span className="inputErrorText" style={{color: 'red', fontSize: '12px', marginTop: '5px', marginLeft: '100px', display: 'block'}}>This field is required</span>}
                    <br/><br/>

                    <div style={{gap: '15px', paddingRight: '630px',display:'flex', justifyContent: 'flex-end'}}>
                        <button type="button" onClick={cancelButton}
                            style={{
                                color: 'black',
                                backgroundColor: '#EEEEEE',
                                width: '85px',
                                height: '40px',
                                borderRadius: '8px',
                                fontSize: '16px',
                            }}>Cancel</button>

                        <button type="submit" 
                            style={{
                                color: 'white',
                                backgroundColor: 'black',
                                width: '85px',
                                height: '40px',
                                borderRadius: '8px',
                                fontSize: '16px',
                            }}>Post</button>
                    </div>
            </form>
        </>
    )
}