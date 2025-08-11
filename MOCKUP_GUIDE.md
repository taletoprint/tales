# Wall Mockup Guide for TaleToPrint

## Required Wall Mockups

You'll need to create 12 wall mockups (one for each example) showing the artwork in real-world settings.

### Mockup Requirements:
- **Aspect Ratio**: 3:4 (600x800px minimum)
- **Settings**: Home environments (living rooms, bedrooms, hallways, etc.)
- **Print Sizes**: Show A4 and A3 frames appropriately sized
- **Style**: Clean, aspirational, well-lit spaces
- **Formats**: Create in PNG, then optimize to AVIF/WebP

### Suggested Room Settings:
1. **Watercolour 1**: Light, airy living room with white/cream walls
2. **Watercolour 2**: Cozy reading nook or cafe-style corner
3. **Oil Painting 1**: Traditional dining room or study
4. **Oil Painting 2**: Rustic living room with warm lighting
5. **Pastel 1**: Bright bedroom or nursery
6. **Pastel 2**: Comfortable family room
7. **Sketch 1**: Modern hallway or entryway
8. **Sketch 2**: Coastal-themed room or study
9. **Storybook 1**: Child's bedroom or playroom
10. **Storybook 2**: Family living area
11. **Impressionist 1**: Elegant dining room
12. **Impressionist 2**: Romantic bedroom or sitting area

### File Naming Convention:
- `mockup_watercolour01_living_room.png`
- `mockup_oil01_dining_room.png`
- etc.

### Tools for Creating Mockups:
- **Photoshop**: Use smart objects for easy artwork replacement
- **Canva**: Has room mockup templates
- **Placeit**: Specialized mockup generator
- **Smart Mockups**: Online mockup tool

### After Creating Mockups:
1. Place PNG files in `/apps/web/public/images/examples/mockups/`
2. Run the optimization script: `./optimize-images.sh`
3. Update the `mockupUrl` paths in `/apps/web/app/examples/page.tsx`

### Example Mockup Update:
```typescript
{
  id: 1,
  style: "Watercolour",
  prompt: "...",
  previewUrl: "/images/examples/watercolour01_...",
  mockupUrl: "/images/examples/mockups/mockup_watercolour01_living_room.png"
}
```