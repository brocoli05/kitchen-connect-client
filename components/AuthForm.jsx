import React, { useState } from "react";

const AuthForm = ({ type, onSubmit, isLoading, error }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const { username, email, password, confirmPassword } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="auth-form-container">
      <h2>{type === "register" ? "Register" : "Log in"}</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {type === "register" && (
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={onChange}
              required
            />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={onChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={onChange}
            required
            minLength="6"
          />
        </div>
        {type === "register" && (
          <div className="form-group">
            <label htmlFor="confirmPassword">Password Confirm</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={onChange}
              required
              minLength="6"
            />
          </div>
        )}
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading
            ? "Loading..."
            : type === "register"
            ? "Register"
            : "Log in"}
        </button>
      </form>
      {type === "register" && (
        <p className="form-switch-text">
          Already have an account? <a href="/login">Login</a>
        </p>
      )}
      {type === "login" && (
        <p className="form-switch-text">
          Don't have an account? <a href="/register">Register</a>
        </p>
      )}
    </div>
  );
};

export default AuthForm;
