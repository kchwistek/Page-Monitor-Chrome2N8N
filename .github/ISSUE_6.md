# Issue #6: Add "Save" and "Save As" buttons for profile management

## Description

The popup should have two separate save buttons for profile management:
- **"Save"** button: Saves the current configuration to the currently selected profile (if a profile is selected)
- **"Save As"** button: Saves the current configuration as a new profile with a custom name

This provides a more intuitive workflow where users can quickly save changes to an existing profile or create a new profile.

## Current Behavior

Currently, there is only one "Save" button that:
- Always shows an input field for entering a profile name
- Requires typing the profile name even if saving to an existing profile
- Doesn't distinguish between updating an existing profile vs. creating a new one

## Expected Behavior

### "Save" Button
- **When a profile is selected**: Saves the current configuration to the selected profile immediately (no input field needed)
- **When no profile is selected**: Shows a message prompting the user to select a profile or use "Save As"
- **Icon**: Could use a floppy disk icon (💾) or checkmark icon (✓)
- **Tooltip**: "Save to selected profile"

### "Save As" Button
- **Always**: Shows the input field for entering a new profile name
- **Behavior**: Same as current "Save" button - creates a new profile or overwrites if name exists
- **Icon**: Could use a "save as" icon or document-plus icon (📄+)
- **Tooltip**: "Save as new profile"

## User Workflow Examples

### Scenario 1: Updating an existing profile
1. User selects a profile from dropdown
2. User makes changes to the configuration
3. User clicks "Save" button
4. Configuration is immediately saved to the selected profile
5. Success message: "✅ Profile '[name]' saved!"

### Scenario 2: Creating a new profile
1. User configures settings
2. User clicks "Save As" button
3. Input field appears for profile name
4. User enters name and confirms
5. New profile is created

### Scenario 3: Quick save workflow
1. User loads a profile
2. User makes minor adjustments
3. User clicks "Save" (one click, no typing needed)
4. Changes are saved instantly

## Technical Details

### Relevant Files
- `src/popup/popup.html` - UI structure (lines 105-137)
- `src/popup/popup.js` - Profile management logic
  - `saveProfile()` method (line 636) - Current save implementation
  - `showSaveProfileInput()` method (line 705) - Shows input field
  - `saveProfileBtn` element - Current single save button

### Implementation Requirements

1. **Update HTML structure:**
   - Replace single `saveProfileBtn` with two buttons: `saveProfileBtn` and `saveAsProfileBtn`
   - Keep the existing `saveProfileGroup` input field for "Save As" functionality

2. **Update JavaScript logic:**
   - Modify `saveProfile()` to handle saving to selected profile (if profile is selected)
   - Create new `saveProfileAs()` method for "Save As" functionality (current behavior)
   - Update `showSaveProfileInput()` to be called only by "Save As" button
   - Add validation in "Save" button handler to check if profile is selected

3. **Button states:**
   - "Save" button should be enabled/disabled based on whether a profile is selected
   - "Save As" button is always enabled

4. **Error handling:**
   - If "Save" is clicked without a selected profile, show helpful message
   - If "Save" is clicked but current config doesn't match loaded profile, show confirmation dialog

## Proposed Solution

### HTML Changes
```html
<button type="button" id="saveProfileBtn" class="btn-icon" title="Save to selected profile">
  <i class="fas fa-save"></i>
</button>
<button type="button" id="saveAsProfileBtn" class="btn-icon" title="Save as new profile">
  <i class="fas fa-file-plus"></i>
</button>
```

### JavaScript Changes

1. **Update `saveProfile()` method:**
   - Check if a profile is selected in the dropdown
   - If selected, save directly to that profile (no input field)
   - If not selected, show message to select a profile or use "Save As"

2. **Create `saveProfileAs()` method:**
   - Move current `saveProfile()` logic here
   - Always shows input field for new profile name

3. **Update event listeners:**
   - `saveProfileBtn` → calls `saveProfile()` (save to selected)
   - `saveAsProfileBtn` → calls `showSaveProfileInput()` (then `saveProfileAs()`)

4. **Add profile selector change listener:**
   - Enable/disable "Save" button based on selection
   - Update button state when profile is loaded

## Acceptance Criteria

- [ ] Two separate buttons: "Save" and "Save As" are visible in the popup
- [ ] "Save" button saves to currently selected profile without showing input field
- [ ] "Save" button is disabled when no profile is selected
- [ ] "Save As" button always shows input field for new profile name
- [ ] "Save" button shows helpful message if clicked without a selected profile
- [ ] Both buttons have appropriate icons and tooltips
- [ ] Existing "Save As" functionality (creating/overwriting profiles) still works
- [ ] Profile selector updates after saving to show the saved profile
- [ ] Success/error messages are clear and informative

## UI/UX Considerations

- **Button placement**: Keep both buttons next to the "Load" button for consistency
- **Visual distinction**: Consider different icons or slight styling differences
- **Accessibility**: Ensure tooltips are descriptive and buttons are keyboard accessible
- **Confirmation**: Consider asking for confirmation when overwriting an existing profile with "Save"
- **Feedback**: Clear success messages indicating which profile was saved

## Notes

- This improvement makes the profile management workflow more intuitive and efficient
- The "Save" button provides quick access for users who frequently update existing profiles
- The "Save As" button maintains the current workflow for creating new profiles
- Consider adding a confirmation dialog when "Save" would overwrite a profile that was modified after being loaded

