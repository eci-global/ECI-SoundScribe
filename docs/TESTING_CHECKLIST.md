# Call Outline Auto-Generation Testing Checklist

## 🔍 **Current Status**
- ✅ RLS policies already exist (that's why we got the "already exists" error)
- ✅ UI changes implemented for automatic generation
- ✅ Enhanced AI prompt and data mapping implemented
- ❓ Need to verify if Edge function is deployed with latest changes
- ❓ Need to test actual auto-generation flow

## 🧪 **Testing Steps**

### **1. Check Browser Console**
When you load a recording with transcript, check the browser console for these logs:
```
🔍 Auto-generation check: { recordingId: "...", hasTranscript: true, ... }
🚀 Auto-triggering outline generation for recording: ...
🤖 Starting auto-generation for recording: ...
🗣️ Calling generateOutline...
📊 Generation result: ...
🔄 Refetching segments...
✅ Auto-generation completed successfully
```

### **2. Database Verification**
Run `CHECK_RLS_STATUS.sql` in Supabase SQL Editor to:
- Verify policies exist
- Check if new topic_segments are being created
- See if enhanced metadata is being stored

### **3. Edge Function Status**
The enhanced Edge function might need to be deployed. Check if:
- Recent changes to `analyze-speakers-topics/index.ts` are deployed
- Enhanced AI prompt (1800 tokens) is active
- Rich metadata insertion is working

### **4. UI Verification**
- ❌ No "Generate AI Outline" button should be visible
- ✅ Should see "AI Analysis in Progress" when auto-generating
- ✅ Should see 5-15 topics with rich metadata when complete

## 🚨 **Possible Issues & Solutions**

### **If No Auto-Generation Triggers:**
- Check console logs for auto-generation check results
- Verify recording has transcript
- Ensure `topicSegments.length === 0`

### **If Generation Fails:**
- Check if Edge function is deployed with latest changes
- Verify RLS policies allow service role access
- Check Edge function logs in Supabase dashboard

### **If Only Basic Outline Shows:**
- Auto-generation hasn't completed yet
- Edge function might be using old version without enhanced prompt
- Database insertion might be failing

## 🔧 **Quick Fixes**

### **Deploy Edge Function (if needed):**
```bash
npx supabase functions deploy analyze-speakers-topics
```

### **Force Refresh Topic Segments:**
```javascript
// In browser console:
window.location.reload();
```

### **Check Edge Function Logs:**
Go to Supabase Dashboard → Edge Functions → analyze-speakers-topics → Logs

## 📞 **Test with Real Recording**
1. Load `/outreach/recordings/[id]` with a recording that has transcript
2. Check browser console for auto-generation logs
3. Wait 10-30 seconds for AI processing
4. Should see comprehensive outline appear automatically
5. Verify rich metadata (decisions, action items, etc.) is displayed