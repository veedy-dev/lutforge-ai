# LutForge AI - Koyeb Deployment Guide

## 🚀 Deploy to Koyeb (FREE)

This guide will help you deploy LutForge AI to Koyeb's free tier, which includes:
- ✅ **Two services** (frontend + backend)
- ✅ **No sleep mode** (always on!)
- ✅ **100GB bandwidth/month**
- ✅ **Global edge deployment**
- ✅ **Automatic HTTPS**

## Prerequisites

1. **GitHub Account** - Your code needs to be in a GitHub repository
2. **Google Gemini API Key** - Get it from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. **Koyeb Account** - Sign up free at [koyeb.com](https://www.koyeb.com)

## Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done):
```bash
git add .
git commit -m "Prepare for Koyeb deployment"
git push origin main
```

2. **Make sure your repository is public** or upgrade to Koyeb Pro for private repos

## Step 2: Deploy Backend (FastAPI)

### 2.1 Create Backend Service

1. Go to [Koyeb Dashboard](https://app.koyeb.com)
2. Click **"Create Service"**
3. Choose **"GitHub"** as source
4. Select your **lutforge-ai** repository
5. Set **"Source"** to `backend/` folder

### 2.2 Configure Backend Settings

**Build Settings:**
- **Build Command**: `pip install -r requirements.txt`
- **Run Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Environment Variables:**
- **GEMINI_API_KEY**: `your_actual_gemini_api_key`
- **CORS_ORIGINS**: `*` (we'll update this after frontend deployment)

**Service Configuration:**
- **Service Name**: `lutforge-backend`
- **Region**: Choose closest to your users
- **Instance Type**: Free tier (should be selected automatically)

### 2.3 Deploy Backend

1. Click **"Deploy"**
2. Wait for deployment (usually 2-3 minutes)
3. **Copy the backend URL** (e.g., `https://lutforge-backend-your-id.koyeb.app`)

## Step 3: Deploy Frontend (Next.js)

### 3.1 Create Frontend Service

1. In Koyeb Dashboard, click **"Create Service"** again
2. Choose **"GitHub"** as source
3. Select your **lutforge-ai** repository again
4. Set **"Source"** to `frontend/` folder

### 3.2 Configure Frontend Settings

**Build Settings:**
- **Build Command**: `npm install && npm run build`
- **Run Command**: `npm start`

**Environment Variables:**
- **NEXT_PUBLIC_API_URL**: `https://lutforge-backend-your-id.koyeb.app` (use your actual backend URL)

**Service Configuration:**
- **Service Name**: `lutforge-frontend`
- **Region**: Same as backend
- **Instance Type**: Free tier

### 3.3 Deploy Frontend

1. Click **"Deploy"**
2. Wait for deployment (usually 3-5 minutes)
3. **Copy the frontend URL** (e.g., `https://lutforge-frontend-your-id.koyeb.app`)

## Step 4: Update CORS Settings

### 4.1 Update Backend CORS

1. Go to your backend service in Koyeb
2. Click **"Settings"** → **"Environment"**
3. Update **CORS_ORIGINS** to your frontend URL:
   ```
   CORS_ORIGINS=https://lutforge-frontend-your-id.koyeb.app
   ```
4. Click **"Save"** and wait for redeployment

## Step 5: Test Your Deployment

1. **Visit your frontend URL**
2. **Test image upload** in the Generate LUT tab
3. **Verify API connection** - you should see no CORS errors in browser console
4. **Test LUT generation** with a sample image

## 🎯 Your Deployment URLs

After successful deployment, you'll have:

- **Frontend**: `https://lutforge-frontend-your-id.koyeb.app`
- **Backend**: `https://lutforge-backend-your-id.koyeb.app`
- **API Docs**: `https://lutforge-backend-your-id.koyeb.app/docs`

## 📋 Common Issues & Solutions

### Issue: "Failed to fetch" errors
**Solution**: Check CORS_ORIGINS environment variable in backend

### Issue: Backend deployment fails
**Solution**: Verify `requirements.txt` is in the backend folder

### Issue: Frontend shows API connection errors
**Solution**: Verify NEXT_PUBLIC_API_URL points to correct backend URL

### Issue: Gemini API errors
**Solution**: Verify GEMINI_API_KEY is set correctly in backend environment

## 🔧 Advanced Configuration

### Custom Domains (Pro Feature)
1. In service settings, go to **"Domains"**
2. Add your custom domain
3. Update DNS records as instructed

### Monitoring & Logs
- View logs in Koyeb dashboard under **"Logs"** tab
- Monitor performance in **"Metrics"** tab

### Scaling (Pro Feature)
- Auto-scaling based on traffic
- Manual scaling options available

## 💰 Cost Monitoring

**Free Tier Limits:**
- **Bandwidth**: 100GB/month
- **Build Time**: Generous limits
- **Always On**: No sleep mode!

**Monitor Usage:**
- Check usage in Koyeb dashboard
- Set up alerts for approaching limits

## 🚀 Next Steps

After successful deployment:

1. **Test thoroughly** with different image types
2. **Monitor performance** for the first few days
3. **Set up custom domain** (optional, requires Pro)
4. **Consider database** for user data (Koyeb offers PostgreSQL)

## 🔗 Useful Links

- [Koyeb Documentation](https://www.koyeb.com/docs)
- [Google Gemini API](https://makersuite.google.com/app/apikey)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

---

**Need Help?** 
- Check Koyeb's excellent documentation
- Join their Discord community
- Open an issue in this repository

Happy deploying! 🚀 