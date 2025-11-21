# Issue #7: Add Import/Export functionality for profiles on settings page

## Description

Add import and export functionality for monitoring profiles on the global settings page. This will allow users to:
- Export all saved profiles to a JSON file for backup or sharing
- Import profiles from a JSON file
- Preserve existing profiles that are not in the imported file
- Optionally overwrite existing profiles that match names in the imported file

## Current Behavior

Currently, profiles can only be managed individually through the popup interface. There is no way to:
- Backup all profiles at once
- Share profiles between different browsers or installations
- Restore profiles from a backup
- Bulk import/export profiles

## Expected Behavior

### Export Functionality
- **Button**: "Export Profiles" button on the settings page
- **Action**: Downloads a JSON file containing all saved profiles
- **File format**: JSON object with profile names as keys
- **File name**: `page-monitor-profiles-YYYY-MM-DD.json` (with current date)
- **Content**: All profiles from `monitoringProfiles` storage key

### Import Functionality
- **Button**: "Import Profiles" button on the settings page
- **Action**: Opens file picker to select a JSON file
- **Validation**: Validates JSON structure before importing
- **Merge strategy**: 
  - Profiles that exist in import but not in current storage: **Add** them
  - Profiles that exist in both: **Ask user** if they want to overwrite (with option to skip)
  - Profiles that exist only in current storage: **Keep** them (preserved)
- **Feedback**: Show summary of import results (added, updated, skipped, errors)

## User Workflow Examples

### Scenario 1: Export profiles for backup
1. User navigates to Settings page
2. User clicks "Export Profiles" button
3. JSON file is downloaded with all current profiles
4. User can save this file for backup

### Scenario 2: Import profiles from another browser
1. User navigates to Settings page
2. User clicks "Import Profiles" button
3. File picker opens, user selects exported JSON file
4. System validates the file
5. If conflicts exist, user is prompted:
   - "Profile 'X' already exists. Overwrite? [Yes] [No] [Skip All]"
6. Import completes, summary shown:
   - "✅ Imported 5 profiles (3 new, 2 updated, 1 skipped)"

### Scenario 3: Merge profiles
1. User has profiles: A, B, C
2. User imports file with profiles: B (updated), D, E
3. Result:
   - A: Kept (not in import)
   - B: Updated (user confirmed overwrite)
   - C: Kept (not in import)
   - D: Added (new)
   - E: Added (new)

## Technical Details

### Relevant Files
- `src/options/options.html` - Settings page UI (add import/export buttons)
- `src/options/options.js` - Settings page logic (implement import/export functions)
- Profile storage: `chrome.storage.local.get(['monitoringProfiles'])`

### JSON File Format

```json
{
  "version": "1.0",
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "profiles": {
    "Profile Name 1": {
      "selector": "#content",
      "refreshInterval": 30000,
      "changeDetection": true,
      "contentType": "html",
      "webhookUrl": "https://example.com/webhook",
      "savedAt": "2024-01-10T08:00:00.000Z"
    },
    "Profile Name 2": {
      "selector": ".main-content",
      "refreshInterval": 60000,
      "changeDetection": false,
      "contentType": "text",
      "webhookUrl": null,
      "savedAt": "2024-01-12T14:20:00.000Z"
    }
  }
}
```

### Implementation Requirements

1. **Export Function:**
   - Read all profiles from `chrome.storage.local`
   - Create JSON object with metadata (version, export date)
   - Use `URL.createObjectURL()` and `<a>` element to trigger download
   - Generate filename with current date

2. **Import Function:**
   - Create hidden `<input type="file">` element
   - Accept only `.json` files
   - Parse and validate JSON structure
   - Compare imported profiles with existing ones
   - Show confirmation dialog for conflicts
   - Merge profiles according to user choices
   - Save merged profiles to storage
   - Show import summary

3. **UI Elements:**
   - Add new section: "Profile Management" on settings page
   - Export button with download icon
   - Import button with upload icon
   - Status messages for export/import operations
   - Optional: Show profile count in section header

4. **Error Handling:**
   - Invalid JSON file format
   - Missing required profile fields
   - File read errors
   - Storage save errors
   - User cancellation

## Proposed Solution

### HTML Changes (`src/options/options.html`)

Add new section after "Page Monitoring Defaults":

```html
<hr />

<div class="form-group">
  <h3><i class="fas fa-bookmark"></i> Profile Management</h3>
  <p class="help-text">Export all profiles to a JSON file for backup, or import profiles from a file.</p>
  
  <div style="display: flex; gap: 10px; margin-top: 15px;">
    <button id="exportProfilesBtn">
      <i class="fas fa-download"></i>
      Export Profiles
    </button>
    <button id="importProfilesBtn">
      <i class="fas fa-upload"></i>
      Import Profiles
    </button>
  </div>
  
  <input type="file" id="importFileInput" accept=".json" style="display: none;" />
  <span id="profileStatus"></span>
</div>
```

### JavaScript Changes (`src/options/options.js`)

1. **Add element references:**
   ```javascript
   this.exportProfilesBtn = document.getElementById('exportProfilesBtn');
   this.importProfilesBtn = document.getElementById('importProfilesBtn');
   this.importFileInput = document.getElementById('importFileInput');
   this.profileStatus = document.getElementById('profileStatus');
   ```

2. **Implement `exportProfiles()` method:**
   - Get all profiles from storage
   - Create JSON with metadata
   - Trigger download

3. **Implement `importProfiles()` method:**
   - Open file picker
   - Read and parse JSON
   - Validate structure
   - Compare with existing profiles
   - Show conflict resolution dialog
   - Merge profiles
   - Save to storage
   - Show summary

4. **Add helper methods:**
   - `validateProfileData(profiles)` - Validate profile structure
   - `showImportConflicts(conflicts)` - Show conflict resolution dialog
   - `mergeProfiles(existing, imported, overwriteList)` - Merge profiles

## Acceptance Criteria

- [ ] "Export Profiles" button downloads a JSON file with all profiles
- [ ] Exported JSON file includes metadata (version, export date)
- [ ] "Import Profiles" button opens file picker for JSON files
- [ ] Import validates JSON structure before processing
- [ ] Import preserves existing profiles not in the imported file
- [ ] Import asks for confirmation before overwriting existing profiles
- [ ] Import shows summary of results (added, updated, skipped, errors)
- [ ] Error messages are clear and helpful
- [ ] File format is documented and versioned
- [ ] Import/export works with all profile fields (selector, refreshInterval, changeDetection, contentType, webhookUrl, savedAt)

## UI/UX Considerations

- **Button placement**: Add profile management section after monitoring defaults
- **Visual feedback**: Show status messages for export/import operations
- **Confirmation dialogs**: Use browser `confirm()` or custom modal for overwrite confirmations
- **Progress indication**: Show loading state during import processing
- **Error handling**: Display user-friendly error messages
- **Accessibility**: Ensure buttons are keyboard accessible and have proper labels

## Edge Cases to Handle

1. **Empty profiles**: Handle case when no profiles exist (export empty object, import to empty storage)
2. **Invalid JSON**: Show clear error if file is not valid JSON
3. **Missing fields**: Validate required fields (selector, refreshInterval, etc.)
4. **Large files**: Handle large profile exports gracefully
5. **User cancellation**: Handle file picker cancellation gracefully
6. **Storage errors**: Handle Chrome storage quota or permission errors
7. **Concurrent modifications**: Consider what happens if profiles are modified during import

## Notes

- This feature enables profile portability and backup capabilities
- The JSON format should be versioned to allow future format changes
- Consider adding a "Preview" feature to show what will be imported before confirming
- Future enhancement: Add ability to export/import individual profiles
- Future enhancement: Add cloud sync option (if desired)

