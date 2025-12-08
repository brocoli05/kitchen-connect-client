# Kitchen-Connect

A social platform for sharing, discovering, and managing cooking recipes built with **Next.js** and **MongoDB Atlas**.  

Users can post, browse, and save recipes, and interact with other food enthusiasts.

---

## Getting Started
1. Clone the repository:
    ```bash
    git clone [YOUR_REPOSITORY_URL]
    cd kitchen-connect-client
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Environment Variables
  Create a file named **`.env.local`** in the root directory and configure the following variables:
  
   ```plaintext
   # Database Connection
   MONGODB_URI=[YOUR_MONGO_DB_CONNECTION_STRING_HERE]
   
   # NextAuth Configuration
   NEXTAUTH_SECRET=[A_LONG_RANDOM_STRING_FOR_SECURITY]
   # NEXTAUTH_URL=http://localhost:3000 (Optional for development)
   
   # JWT_SECRET (Used if you handle custom JWTs, separate from NextAuth)
   JWT_SECRET=[YOUR_CUSTOM_JWT]
   
   # OAuth Provider Example (Required if enabling "Sign in with Google")
   # GOOGLE_CLIENT_ID=...
   # GOOGLE_CLIENT_SECRET=...
   
   # Spoonacular API Key (If using external recipe data/search)
   # SPOONACULAR_API_KEY=
   ```

4. Run the development server (Locally):
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 in your browser.

---
## Main Pages & Endpoints

| Path | Description |
| :--- | :--- |
| `/login` | User login page. |
| `/register` | New user registration. |
| `/mainpage` | Main feed/dashboard with all recipes. |
| `/posts/create` | Form to create a new recipe post. |
| `/users/[userId]` | User profile and their published recipes. |
| `/posts/[postId]` | Detailed view of a specific recipe post. |


## Tech Stack
- Frontend Framework: Next.js (Pages Router)

- Data Fetching: SWR

- Database: MongoDB Atlas (via mongodb official driver)

- Authentication: NextAuth.js

- Styling: CSS / React-Bootstrap

- File Handling: formidable / multer

---

## Deployment
The project is configured for seamless deployment on Vercel.

Important: Ensure all necessary environment variables (especially MONGODB_URI and NEXTAUTH_SECRET) are correctly set in your Vercel project settings for the Production environment.

---

## Learn More
To learn more about the technologies used in this project:

- Next.js Documentation
 – features and API reference

- Learn Next.js
 – interactive tutorial

- MongoDB Documentation
 – database guides and references

- Vercel Deployment Docs
 – how to deploy Next.js apps
