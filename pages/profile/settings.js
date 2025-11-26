import React from 'react';
import TopNavBar from '../../components/TopNavBar';
import SettingsTab from '../../components/SettingsTab';

export default function Settings() {
  return (
    <div>
      <TopNavBar />
      <SettingsTab activeTab="notifications">
        <div style={{ marginLeft: '0' , paddingTop: '1rem' }}>
          <h3>Notifications</h3>
          <p>Manage your notifications.</p>
        </div>
      </SettingsTab>
    </div>
  );
}
