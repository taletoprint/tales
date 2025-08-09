# TaleToPrint Testing Guide

## Starting the Application

1. Open a terminal in the project root directory
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open your browser to http://localhost:3000

## What to Test

### 1. Homepage Load
- ✅ Should see "TaleToPrint" header
- ✅ Should see "Transform your stories into beautiful art prints" tagline
- ✅ Should see the story input form

### 2. Story Input Form
Test the following:

**Valid Story:**
- Type a story with at least 20 characters (e.g., "My grandmother's garden was a magical place where flowers bloomed year-round")
- Select different art styles (Watercolor, Oil Painting, etc.)
- Click "Create Preview"
- Should see "Creating..." while loading
- Should receive a preview image (placeholder for now)

**Invalid Story:**
- Try with less than 20 characters
- Button should be disabled
- Try with empty text
- Button should be disabled

**Character Counter:**
- Type text and watch the character counter update
- Should show "X/500 characters"
- Try typing more than 500 characters (should be limited)

### 3. Preview Display
After generating a preview:
- ✅ Should see a placeholder image (512x512)
- ✅ Should see "Preview - Watermarked" label
- ✅ Should see "Your Story Transformed" heading
- ✅ Should see list of benefits (HD quality, A3 size, etc.)
- ✅ Should see "Purchase Print - £59.99" button

### 4. Rate Limiting
- Generate 3 previews
- The UI should show "2 free previews remaining today" after first
- Then "1 free preview remaining today"
- Then "0 free previews remaining today"
- On the 4th attempt, should show email gate modal

### 5. API Testing
You can test the API directly:

```bash
# Test preview generation endpoint
curl -X POST http://localhost:3000/api/preview/generate \
  -H "Content-Type: application/json" \
  -d '{
    "story": "My grandmother had the most beautiful garden in the village",
    "style": "WATERCOLOR"
  }'
```

Expected response:
```json
{
  "preview": {
    "id": "preview-[timestamp]",
    "imageUrl": "https://via.placeholder.com/512x512.png?text=Preview+WATERCOLOR",
    "prompt": "A watercolor artwork depicting: My grandmother had the most beautiful garden in the...",
    "timestamp": 1234567890,
    "isPreview": true,
    "expiresAt": "[date 7 days from now]"
  },
  "remainingAttempts": 2,
  "requiresEmail": false
}
```

### 6. Error Cases
Test these scenarios:

**Short Story:**
```bash
curl -X POST http://localhost:3000/api/preview/generate \
  -H "Content-Type: application/json" \
  -d '{"story": "Too short", "style": "WATERCOLOR"}'
```
Should return 400 error

**Invalid Style:**
```bash
curl -X POST http://localhost:3000/api/preview/generate \
  -H "Content-Type: application/json" \
  -d '{"story": "A valid story that is long enough", "style": "INVALID_STYLE"}'
```
Should return 400 error

## Console Logging

Open browser DevTools (F12) and check:
1. Console for any errors
2. Network tab to see API calls
3. When clicking "Purchase Print", should see console log with preview ID

## Known Limitations (Mock Implementation)

- Preview images are placeholders (not actual AI-generated)
- Rate limiting is mocked (resets on page refresh)
- No actual database connection needed
- Purchase button only logs to console
- Email gate and upgrade modals just close (no functionality)

## Next Steps

Once basic testing is complete, you would:
1. Set up a PostgreSQL database
2. Add real AI service API keys
3. Implement Stripe payment processing
4. Add Prodigi integration
5. Set up Redis for proper rate limiting