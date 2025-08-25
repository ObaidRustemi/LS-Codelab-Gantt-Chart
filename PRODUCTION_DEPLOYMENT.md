# CP Gantt Production Deployment Guide 🚀

## Production Release v1.0.0

**Status**: ✅ DEPLOYED AND READY  
**Date**: August 25, 2025  
**Manifest URL**: `https://storage.googleapis.com/ls-code-lab/cp-gantt/v1/manifest.json`

## Deployment Summary

### Production Assets Location
```
gs://ls-code-lab/cp-gantt/v1/
├── cp-gantt.js         # Main visualization bundle (300.5 KB)
├── viz-cp-gantt.json   # Configuration schema
├── viz-cp-gantt.css    # Styles
└── manifest.json       # Production manifest (devMode: false)
```

### Key Production Settings
- **Cache Control**: `public, max-age=86400, immutable` (24-hour cache)
- **Dev Mode**: `false` (enables caching in Looker Studio)
- **Version**: `v1`

## How to Use in Looker Studio

### For New Reports:
1. Open your Looker Studio report
2. Click "Add a chart" → "Community visualizations" → "Explore more"
3. Enter the manifest URL:
   ```
   https://storage.googleapis.com/ls-code-lab/cp-gantt/v1/manifest.json
   ```
4. Click "Submit"
5. Select "CP Gantt" from the list
6. Configure your data fields:
   - **Dimensions**: Team, Project Name, CP3 Date, CP3.5 Date, CP4 Date, CP5 Date
   - **Metrics**: (optional, not used by this viz)

### For Existing Reports Using Dev Version:
1. Edit your existing CP Gantt visualization
2. In the properties panel, look for "Community visualization"
3. Click the pencil icon to edit
4. Replace the dev manifest URL with the production URL above
5. Click "Submit"
6. Your visualization will update to use the production version

## Features Included in v1.0.0

### Core Functionality
- ✅ Gantt chart with CP3, CP3.5, CP4, CP5 milestone phases
- ✅ Team-based color coding
- ✅ Dynamic "Today" line with current date display
- ✅ Milestone tick marks (diamonds) for precise dates

### Interactive Controls
- ✅ View duration buttons: 1M, 3M, 6M
- ✅ "TODAY" button to snap to current date
- ✅ Horizontal panning via drag or mouse wheel
- ✅ Keyboard navigation:
  - Arrow keys: 1 week (with acceleration on double-press)
  - PageUp/PageDown: 1 month
  - Continuous scrolling on hold

### Visual Polish
- ✅ Orange glowing month labels
- ✅ Clipped rendering to prevent bar overflow into labels
- ✅ Responsive sizing within Looker Studio
- ✅ Dark theme compatible

### Data Handling
- ✅ Robust date parsing (YYYYMMDD, DD/Mon/YY, epoch, etc.)
- ✅ Flexible field name resolution
- ✅ Live data updates
- ✅ Filter interactions on click

## Configuration Options

Users can customize via Looker Studio's style panel:
- Row height
- Show/hide Today line
- Today line color and width
- Show/hide milestone ticks
- Month label size and color
- Enable/disable pan controls
- Keyboard acceleration

## Performance Notes

- Initial load may take a moment due to D3.js bundle size
- Production caching significantly improves subsequent loads
- Handles datasets with 50+ projects smoothly
- Pan/zoom operations are GPU-accelerated

## Future Versions

For future updates:
1. Create a new version directory (e.g., `v2/`)
2. Deploy new assets with updated manifest
3. Users can migrate by updating the manifest URL

## Troubleshooting

If the visualization doesn't appear:
1. Hard refresh the Looker Studio report (Ctrl+Shift+R / Cmd+Shift+R)
2. Remove and re-add the visualization with the production manifest URL
3. Check browser console for any errors (remember to inspect the iframe)
4. Ensure all required date fields are properly mapped

## Support

For issues or questions:
- Review the [Integration Case Study](./LOOKER_STUDIO_INTEGRATION_CASE_STUDY.md)
- Check the [Rollout Plan](./ROLLOUT_PLAN.md) for technical details
- File issues on the GitHub repository

---

🎉 **Congratulations on your production deployment!** Your CP Gantt visualization is now ready for prime time in Looker Studio!
