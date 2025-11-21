# Issue #5: Profile dropdown should reflect selected/used profile name

## Description

The profile dropdown in the popup should always reflect the selected/used profile name when a configuration has been saved or loaded. Currently, when a profile is loaded or when a tab's saved configuration is applied, the profile selector dropdown does not update to show which profile is currently active.

## Current Behavior

1. **When loading a profile manually:**
   - User selects a profile from the dropdown and clicks "Load"
   - Form fields are populated with the profile's configuration
   - Profile selector dropdown remains on the selected profile (this works correctly)

2. **When a tab's saved configuration is loaded:**
   - User selects a different tab
   - The popup loads the saved configuration for that tab via `updateUIFromStatus()`
   - Form fields are populated with the tab's configuration
   - **Problem:** Profile selector dropdown does not update to show which profile was used to create that configuration (if any)

3. **When saving a profile:**
   - After saving, the profile selector is set to the saved profile name (this works correctly)
   - However, if the configuration was originally loaded from a different profile, the selector doesn't reflect that

## Expected Behavior

The profile selector dropdown should:
- Show the profile name when a profile is loaded
- Show the profile name when a tab's saved configuration matches a saved profile
- Update automatically when configurations are loaded from storage
- Maintain the selected profile state across tab switches

## Technical Details

### Relevant Files
- `src/popup/popup.js` - Main popup controller
  - `updateUIFromStatus()` (line 239) - Updates form fields but doesn't update profile selector
  - `loadProfile()` (line 611) - Loads profile and populates form, but selector should already be set
  - `applyConfig()` (line 540) - Applies configuration but doesn't handle profile name

### Root Cause

The `updateUIFromStatus()` method populates form fields from the monitoring configuration but doesn't:
1. Check if the current configuration matches any saved profile
2. Update the profile selector to reflect the matching profile

Additionally, when configurations are saved, there's no mechanism to store which profile was used, making it impossible to restore the profile selection later.

## Proposed Solution

1. **Store profile name in monitoring configuration:**
   - When a profile is loaded and monitoring is started, store the profile name in the tab's monitoring config
   - When a profile is saved and used, store the profile name

2. **Update profile selector when loading configs:**
   - In `updateUIFromStatus()`, check if the config has a `profileName` property
   - If found, set `this.profileSelector.value = config.profileName`
   - If not found, try to match the current config against saved profiles and set the selector if a match is found

3. **Match configurations to profiles:**
   - Create a helper method to compare current config with saved profiles
   - If config matches a profile exactly, update the selector to show that profile

## Acceptance Criteria

- [ ] When a profile is loaded, the profile selector shows the selected profile name
- [ ] When a tab's saved configuration is loaded, if it matches a saved profile, the selector shows that profile
- [ ] When switching between tabs, the profile selector updates to reflect the active profile (if any)
- [ ] The profile selector state persists correctly when configurations are saved/loaded

## Notes

- This issue affects user experience and makes it unclear which profile is currently active
- The fix should maintain backward compatibility with existing saved configurations that don't have profile names
- Consider adding a visual indicator or tooltip to show when the current config matches a profile

