import React, { useState } from "react";
import { useRouter } from "next/router";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Dropdown } from "react-bootstrap";

export default function TopNavBar({}) {
  const router = useRouter();
  return (
    <div>
      <Row className="m-3 d-flex align-items-center topnav">
        <Col md={8} className="d-flex justify-content-start topnav-left">
          <a className="fw-bold active" href="/mainpage">
            Kitchen Connect
          </a>
        </Col>
        <Col
          md={4}
          className="d-flex justify-content-end topnav-right d-flex align-items-center"
        >
          <button
            onClick={() => router.push("/share")}
            className="me-3 rounded-3 d-flex align-items-center justify-content-center btn btn-link fw-bold"
            style={{
              textDecoration: "none",
              color: "#FFFFFF",
              backgroundColor: "#000000ff",
              border: "none",
              height: "35px",
              width: "56px",
            }}
            type="button"
          >
            Share
          </button>
          <a
            href="/profile/edit"
            className=" d-flex align-items-center h-100 justify-content-center btn btn-link"
          >
            <img
              className="rounded-circle"
              src={"/Avatar.png"}
              alt="User Avatar"
            />
          </a>
          <Dropdown className="me-3 rounded-3 d-flex align-items-center justify-content-center">
            <Dropdown.Toggle
              variant="light"
              className="fw-bold "
              style={{
                // width: "46px",
                backgroundColor: "#EEEEEE",
                border: "none",
                fontSize: "1.5rem",
                color: "#333",
                height: "35px",
                width: "56px",
              }}
              id="dropdown-settings"
            ></Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.Item onClick={() => router.push("/settings")}>
                Settings…
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>
    </div>
  );
}
