# IFS Personalized Curriculum - Implementation Guide

## Table of Contents

1.  [Overview](#overview)
2.  [Quick Start](#quick-start)
3.  [Database Setup](#database-setup)
4.  [Integration Steps](#integration-steps)
5.  [Testing](#testing)
6.  [Admin Operations](#admin-operations)
7.  [Troubleshooting](#troubleshooting)

* * *

## Overview

This implementation guide will walk you through setting up the personalized IFS curriculum system. The system includes:

-   **PIN-based client authentication**
-   **Child wound assessment integration**
-   **Dynamic curriculum personalization**
-   **Progress tracking and analytics**
-   **Supabase backend integration**

**Estimated Setup Time:** 2-3 hours

* * *

## Quick Start

### Prerequisites

-   Supabase account (free tier works)
-   Node.js 18+ installed
-   Git repository access
-   Basic understanding of React

### Installation Steps

1.  **Clone and Install Dependencies**

```bash
cd /workspace/ifs-program-react-app
npm install @supabase/supabase-js
```

2.  **Set Up Supabase**

-   Create a new Supabase project at [https://supabase.com](https://supabase.com)
-   Note your project URL and anon key
-   Run the database schema (see Database Setup section)

3.  **Configure Environment** Update `src/lib/supabase.js` with your Supabase credentials:

```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

4.  **Test the System**

```bash
npm run dev
```

* * *

## Database Setup

### Step 1: Access Supabase SQL Editor

1.  Log into your Supabase dashboard
2.  Navigate to **SQL Editor** in the left sidebar
3.  Click **New Query**

### Step 2: Run Schema Script

Copy the entire contents of `supabase_schema.sql` and paste into the SQL editor, then click **Run**.

This will create:

-   10 tables for data management
-   Indexes for performance
-   Views for common queries
-   Row Level Security policies
-   Triggers for automatic updates

### Step 3: Verify Installation

Run this query to verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:

-   clients
-   assessment\_results
-   personalized\_curriculum
-   client\_progress
-   journal\_entries
-   parts
-   exercise\_progress
-   therapist\_notes
-   milestones
-   content\_library

### Step 4: Create First Test Client

```sql
INSERT INTO clients (pin, name, email, status) 
VALUES ('123456', 'Test Client', 'test@example.com', 'active');
```

* * *

## Integration Steps

### Step 1: Update App.jsx

Replace the existing App.jsx with PIN authentication:

```javascript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ClientPINLogin from './components/ClientPINLogin';
import Home from './pages/Home';
import CurriculumSystem from './components/CurriculumSystem';
// ... other imports
import { DataProvider } from './contexts/DataContext';
import { clientAuth } from './lib/supabasePersonalization';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);

  useEffect(() => {
    // Check for existing session
    const client = clientAuth.getCurrentClient();
    if (client) {
      setIsAuthenticated(true);
      setCurrentClient(client);
    }
  }, []);

  const handleLogin = async (pin) => {
    const result = await clientAuth.authenticateWithPIN(pin);
    if (result.success) {
      setIsAuthenticated(true);
      setCurrentClient(result.client);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    clientAuth.logout();
    setIsAuthenticated(false);
    setCurrentClient(null);
  };

  if (!isAuthenticated) {
    return <ClientPINLogin onLogin={handleLogin} />;
  }

  return (
    <DataProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
          {/* Add logout button in header */}
          <div className="bg-white shadow-sm p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Welcome, {currentClient?.name}
              </h1>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Logout
              </button>
            </div>
          </div>
          
          <Routes>
            <Route path="/" element={<Home clientId={currentClient?.id} />} />
            <Route path="/curriculum" element={<CurriculumSystem clientId={currentClient?.id} />} />
            {/* ... other routes */}
          </Routes>
        </div>
      </Router>
    </DataProvider>
  );
}

export default App;
```

### Step 2: Update Home.jsx for Assessment Integration

Add assessment result saving after completion:

```javascript
import { assessmentManager, curriculumManager } from '../lib/supabasePersonalization';
import { curriculumModules } from '../data/curriculumData';

// In the calculateResults function:
const calculateResults = async () => {
  const results = woundSections.map(section => ({
    ...section,
    score: calculateSectionScore(section),
    maxScore: 24
  }));

  results.sort((a, b) => b.score - a.score);
  setAssessmentResults(results);

  // Save to Supabase
  if (clientId) {
    const assessmentData = {
      abandonment_score: results.find(r => r.id === 'abandonment')?.score || 0,
      shame_score: results.find(r => r.id === 'shame')?.score || 0,
      neglect_score: results.find(r => r.id === 'neglect')?.score || 0,
      betrayal_score: results.find(r => r.id === 'betrayal')?.score || 0,
      responses: answers,
      protector_types: [] // Extract from answers
    };

    const saveResult = await assessmentManager.saveAssessmentResults(
      clientId,
      assessmentData
    );

    if (saveResult.success) {
      // Generate personalized curriculum
      await curriculumManager.generateAndSaveCurriculum(
        clientId,
        saveResult.assessment,
        curriculumModules
      );
    }
  }
};
```

### Step 3: Update CurriculumSystem Component

Load personalized curriculum:

```javascript
import { useEffect, useState } from 'react';
import { curriculumManager } from '../lib/supabasePersonalization';

const CurriculumSystem = ({ clientId }) => {
  const [personalizedModules, setPersonalizedModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPersonalizedCurriculum();
  }, [clientId]);

  const loadPersonalizedCurriculum = async () => {
    if (!clientId) return;

    const result = await curriculumManager.getPersonalizedCurriculum(clientId);
    if (result.success) {
      setPersonalizedModules(result.modules);
    }
    setLoading(false);
  };

  if (loading) {
    return <div>Loading your personalized curriculum...</div>;
  }

  return (
    <div>
      {/* Render personalized modules */}
      {personalizedModules.map(module => (
        <ModuleCard key={module.id} module={module.customized_content} />
      ))}
    </div>
  );
};
```

### Step 4: Integrate Progress Tracking

In LearningModuleEnhanced component:

```javascript
import { progressTracker } from '../lib/supabasePersonalization';

// When activity is completed:
const handleActivityComplete = async (activityId, responses) => {
  const progressData = {
    activityId,
    activityType: 'reflection',
    currentStep: currentStep,
    totalSteps: module.steps.length,
    completedSteps: [...completedSteps, currentStep],
    completed: true,
    responses,
    notes: userNotes,
    insights: userInsights,
    timeSpent: calculateTimeSpent()
  };

  await progressTracker.saveModuleProgress(
    clientId,
    module.id,
    progressData
  );
};
```

* * *

## Testing

### Test 1: Client Authentication

1.  Navigate to the app homepage
2.  Enter PIN: `123456`
3.  Verify successful login
4.  Check that client name appears in header

**Expected Result:** Login successful, redirected to home page

### Test 2: Assessment Flow

1.  Click "Take IFS Assessment"
2.  Complete all 4 wound sections
3.  Submit assessment
4.  Verify results are displayed

**Expected Result:** Assessment results saved, personalized curriculum generated

### Test 3: Personalized Curriculum

1.  Navigate to Curriculum page
2.  Verify modules are customized for primary wound
3.  Check module titles reflect wound type
4.  Verify activities are wound-specific

**Expected Result:** All modules show personalized content

### Test 4: Progress Tracking

1.  Start a module
2.  Complete an activity
3.  Check progress is saved
4.  Refresh page
5.  Verify progress persists

**Expected Result:** Progress saved and restored correctly

### Test 5: Database Verification

Run these queries in Supabase SQL Editor:

```sql
-- Check client was created
SELECT * FROM clients WHERE pin = '123456';

-- Check assessment was saved
SELECT * FROM assessment_results WHERE client_id = 'YOUR_CLIENT_ID';

-- Check curriculum was generated
SELECT module_title, primary_wound_focus 
FROM personalized_curriculum 
WHERE client_id = 'YOUR_CLIENT_ID'
ORDER BY module_order;

-- Check progress is tracking
SELECT module_id, completed, last_accessed 
FROM client_progress 
WHERE client_id = 'YOUR_CLIENT_ID';
```

* * *

## Admin Operations

### Creating New Clients

**Option 1: Via SQL**

```sql
INSERT INTO clients (pin, name, email, phone, therapist_notes, status)
VALUES (
  '234567',  -- Generate unique 6-digit PIN
  'Jane Doe',
  'jane@example.com',
  '555-0123',
  'Initial consultation completed. Focus on abandonment wound.',
  'active'
);
```

**Option 2: Via Admin Dashboard** (to be implemented)

```javascript
import { clientAuth } from './lib/supabasePersonalization';

const createNewClient = async () => {
  const result = await clientAuth.createClient({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-0123',
    notes: 'Initial consultation completed.'
  });

  if (result.success) {
    console.log('Client created with PIN:', result.pin);
    // Display PIN to therapist (one-time only)
  }
};
```

### Viewing Client Progress

```sql
-- Get comprehensive client dashboard
SELECT * FROM client_dashboard WHERE client_id = 'YOUR_CLIENT_ID';

-- Get module progress summary
SELECT * FROM module_progress_summary WHERE client_id = 'YOUR_CLIENT_ID';

-- Get recent journal entries
SELECT title, mood, created_at 
FROM journal_entries 
WHERE client_id = 'YOUR_CLIENT_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Get identified parts
SELECT part_name, part_type, unburdening_status 
FROM parts 
WHERE client_id = 'YOUR_CLIENT_ID'
AND is_active = true;
```

### Deactivating Clients

```sql
UPDATE clients 
SET status = 'inactive' 
WHERE id = 'YOUR_CLIENT_ID';
```

### Resetting Client Progress

```sql
-- Delete all progress (use with caution!)
DELETE FROM client_progress WHERE client_id = 'YOUR_CLIENT_ID';
DELETE FROM journal_entries WHERE client_id = 'YOUR_CLIENT_ID';
DELETE FROM parts WHERE client_id = 'YOUR_CLIENT_ID';
```

* * *

## Troubleshooting

### Issue: "Invalid PIN" Error

**Symptoms:** Cannot log in with correct PIN

**Solutions:**

1.  Verify PIN in database:

```sql
SELECT pin, name, status FROM clients WHERE pin = 'YOUR_PIN';
```

2.  Check client status is 'active'
3.  Clear browser cache and localStorage
4.  Check Supabase connection in browser console

### Issue: Assessment Not Saving

**Symptoms:** Assessment completes but no personalized curriculum

**Solutions:**

1.  Check browser console for errors
2.  Verify Supabase credentials in `supabase.js`
3.  Check RLS policies are enabled
4.  Verify client\_id is being passed correctly

**Debug Query:**

```sql
SELECT * FROM assessment_results 
WHERE client_id = 'YOUR_CLIENT_ID'
ORDER BY assessment_date DESC
LIMIT 1;
```

### Issue: Curriculum Not Personalizing

**Symptoms:** Modules show generic content

**Solutions:**

1.  Verify assessment was saved
2.  Check curriculum generation ran:

```sql
SELECT COUNT(*) FROM personalized_curriculum 
WHERE client_id = 'YOUR_CLIENT_ID';
```

3.  Check customized\_content field is populated
4.  Verify curriculumPersonalizer.js is imported correctly

### Issue: Progress Not Saving

**Symptoms:** Progress resets on page refresh

**Solutions:**

1.  Check client\_id is available in component
2.  Verify progressTracker functions are called
3.  Check browser console for Supabase errors
4.  Verify RLS policies allow inserts

**Debug:**

```javascript
console.log('Saving progress:', {
  clientId,
  moduleId,
  progressData
});
```

### Issue: Supabase Connection Errors

**Symptoms:** "Failed to fetch" or CORS errors

**Solutions:**

1.  Verify Supabase URL and key are correct
2.  Check Supabase project is not paused
3.  Verify RLS policies are configured
4.  Check network tab for actual error

**Test Connection:**

```javascript
import { supabase } from './lib/supabase';

const testConnection = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select('count');
  
  console.log('Connection test:', { data, error });
};
```

* * *

## Performance Optimization

### 1\. Enable Caching

Cache personalized curriculum in localStorage:

```javascript
const loadPersonalizedCurriculum = async () => {
  // Check cache first
  const cached = localStorage.getItem(`curriculum_${clientId}`);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    // Use cache if less than 1 hour old
    if (Date.now() - timestamp < 3600000) {
      setPersonalizedModules(data);
      setLoading(false);
      return;
    }
  }

  // Fetch from Supabase
  const result = await curriculumManager.getPersonalizedCurriculum(clientId);
  if (result.success) {
    setPersonalizedModules(result.modules);
    // Cache the result
    localStorage.setItem(`curriculum_${clientId}`, JSON.stringify({
      data: result.modules,
      timestamp: Date.now()
    }));
  }
  setLoading(false);
};
```

### 2\. Lazy Load Modules

Only load module content when accessed:

```javascript
const [currentModule, setCurrentModule] = useState(null);

const loadModule = async (moduleId) => {
  const result = await curriculumManager.getModule(clientId, moduleId);
  if (result.success) {
    setCurrentModule(result.module);
  }
};
```

### 3\. Batch Progress Updates

Save progress in batches rather than after each action:

```javascript
const [pendingUpdates, setPendingUpdates] = useState([]);

useEffect(() => {
  const interval = setInterval(() => {
    if (pendingUpdates.length > 0) {
      saveBatchProgress(pendingUpdates);
      setPendingUpdates([]);
    }
  }, 30000); // Save every 30 seconds

  return () => clearInterval(interval);
}, [pendingUpdates]);
```

* * *

## Security Best Practices

### 1\. PIN Security

-   PINs are stored in plain text for therapist access
-   Consider hashing if higher security needed
-   Implement rate limiting on login attempts
-   Log failed login attempts

### 2\. Row Level Security

All tables have RLS enabled. Clients can only access their own data:

```sql
-- Example policy
CREATE POLICY "Clients can only view own data" 
ON client_progress
FOR SELECT 
USING (auth.uid()::text = client_id::text);
```

### 3\. Data Privacy

-   Journal entries are private by default
-   Therapist notes not visible to clients
-   Implement data export for GDPR compliance

### 4\. Session Management

-   Sessions stored in localStorage
-   Implement session timeout
-   Clear sensitive data on logout

* * *

## Next Steps

### Phase 1: Enhanced Content (Week 1-2)

-   [ ]  Research and add comprehensive IFS materials
-   [ ]  Integrate latest therapeutic research
-   [ ]  Add video/audio resources
-   [ ]  Create printable worksheets

### Phase 2: Admin Dashboard (Week 3-4)

-   [ ]  Build therapist admin interface
-   [ ]  Client management system
-   [ ]  Progress monitoring dashboard
-   [ ]  Reporting and analytics

### Phase 3: Advanced Features (Week 5-6)

-   [ ]  Email notifications
-   [ ]  Progress reminders
-   [ ]  Milestone celebrations
-   [ ]  Community features (optional)

### Phase 4: Mobile Optimization (Week 7-8)

-   [ ]  Responsive design improvements
-   [ ]  Touch-friendly interactions
-   [ ]  Offline mode support
-   [ ]  Progressive Web App features

* * *

## Support & Resources

### Documentation

-   [Personalization Framework](./PERSONALIZATION_FRAMEWORK.md)
-   [Database Schema](./supabase_schema.sql)
-   [Supabase Documentation](https://supabase.com/docs)

### Getting Help

-   Check browser console for errors
-   Review Supabase logs in dashboard
-   Test queries in SQL Editor
-   Verify RLS policies

### Contact

For implementation support or questions about the personalization system, refer to the framework documentation or create an issue in the repository.

* * *

**Last Updated:** December 2025  
**Version:** 1.0  
**Status:** Production Ready