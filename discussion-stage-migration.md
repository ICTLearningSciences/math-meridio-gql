## Migrating Discussion Stage / Prompt Steps Between Environments

### Overview

This guide walks through migrating `discussionstages` documents from one environment (e.g., Dev) to another (e.g., QA) using MongoDB Compass.

---

### Prerequisites

* Access to MongoDB Compass
* Connection strings for each environment (stored in 1Password under *Meridio Connection Strings*)

---

### Step 1: Export Data from Source Environment (Dev)

1. Open MongoDB Compass.
2. Connect to the **Dev** database.
3. Expand the database to view available shards.
4. Select the `test` database shard.
5. Locate and select the `discussionstages` collection.
6. Click **Export Data**.
7. Choose **Export the full collection**.
8. Click **Export...** and save the file locally.

---

### Step 2: Backup Target Environment (QA)

1. Connect to the **QA** database.
2. Navigate to the `test` shard.
3. Select the `discussionstages` collection.
4. Click **Export Data**.
5. Export the full collection to create a backup of the current QA data.

---

### ⚠️ Warning: Destructive Operation

You are about to delete all existing `discussionstages` documents in the QA environment.

**Ensure you have successfully created a backup before proceeding.**

---

### Step 3: Clear Target Collection (QA)

1. In MongoDB Compass, click **Open MongoDB Shell** (top right).
2. Verify the shell header reads: `math qa/Shell`.
3. Run the following command:

```javascript
db["discussionstages"].deleteMany({})
```

---

### Step 4: Import Data into Target Environment (QA)

1. Return to the `discussionstages` collection in QA.
2. Click **Add Data**.
3. Select **Import JSON or CSV file**.
4. Choose the previously exported file from Dev.
5. Complete the import process.

---

### Completion

The `discussionstages` collection from Dev has now been successfully migrated to QA.
