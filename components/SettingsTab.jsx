import React from 'react';
import Link from 'next/link';
import { Row, Col } from 'react-bootstrap';

export default function SettingsTab({ activeTab, children }) {
  return (
    <Row className="mt-4" style={{ marginLeft: '0', paddingLeft: '0' }}>
      
      <Col md={3}>
        <div style={{ paddingLeft: "50px"}}>
          <Link href="/mainpage">← Back</Link>
        </div>
        <h2 style={{ paddingLeft: '4rem', paddingTop: '1rem', fontWeight: 'bold', color: 'black' }}>
          Settings
        </h2>
      </Col>


      <Col 
        md={9} 
        style={{ 
          paddingLeft: '0', 
          marginLeft: '-9rem',  
          marginTop: '3.125rem'
        }}
      >

        <div
          style={{
            display: 'flex',
            marginBottom: '10px',
            gap: '1px',
            paddingLeft: '0',
            marginLeft: '0',
            justifyContent: 'center',
          }}
        >
          <Link href="/profile/settings" style={{ textDecoration: 'none' }}>
            <span style={{ cursor: 'pointer', backgroundColor: activeTab === 'notifications' ? 'lightblue' : 'lightgrey', color: 'black', padding: '10px 75px', border: '1px solid black', borderRadius: '5px' }}>Notifications</span>
          </Link>

          <Link href="/profile/edit" style={{ textDecoration: 'none' }}>
            <span style={{ cursor: 'pointer', backgroundColor: activeTab === 'update' ? 'lightblue' : 'lightgrey', color: 'black', padding: '10px 75px', border: '1px solid black', borderRadius: '5px' }}>Update Profile</span>
          </Link>

          <Link href="/profile/delete" style={{ textDecoration: 'none' }}>
            <span style={{ cursor: 'pointer', backgroundColor: activeTab === 'delete' ? 'lightblue' : 'lightgrey', color: 'black', padding: '10px 75px', border: '1px solid black', borderRadius: '5px' }}>Delete Profile</span>
          </Link>
        </div>

        <div
          style={{
            borderBottom: '1px solid #ddd',
            width: '1030px',
            marginBottom: '20px',
            paddingTop: '0.3rem',
            margin: '0 auto'
          }}
        ></div>

        {children}

      </Col>
    </Row>
  );
}