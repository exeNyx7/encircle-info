# 🚀 Free Deployment Guide for Encircle

This guide will help you deploy Encircle completely **free** using Vercel (frontend), Render (backend), and MongoDB Atlas (database).

---

## 📋 Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- Render account (sign up at https://render.com)
- MongoDB Atlas account (sign up at https://cloud.mongodb.com)

---

## 🗄️ Step 1: Set Up MongoDB Atlas (Free Tier)

1. **Create MongoDB Atlas Account**
   - Go to https://cloud.mongodb.com
   - Sign up for a free account
   - Verify your email

2. **Create a Free Cluster**
   - Click "Build a Database"
   - Select "FREE" tier (M0 Sandbox - 512MB storage)
   - Choose a cloud provider and region (closest to your users)
   - Name your cluster (e.g., "encircle-cluster")
   - Click "Create"

3. **Configure Database Access**
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Set username: `encircle_user`
   - Generate a strong password (save it!)
   - Set role: "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access**
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - (This is safe because authentication is required)
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" in left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like):
     ```
     mongodb+srv://encircle_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - **Replace `<password>` with your actual password**
   - **Add database name after `.net/`**: `...mongodb.net/encircle?retryWrites...`

---

## 🖥️ Step 2: Deploy Backend to Render (Free Tier)

1. **Push Code to GitHub**
   ```bash
   cd c:\Users\GG STORE\Documents\GitHub\encircle-info
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

3. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `encircle-info` repository
   - Configure:
     - **Name**: `encircle-server` (or your choice)
     - **Root Directory**: `server`
     - **Environment**: `Node`
     - **Region**: Choose closest to you
     - **Branch**: `main`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: `Free`

4. **Add Environment Variables**
   - Scroll to "Environment Variables"
   - Click "Add Environment Variable"
   - Add these variables:
     
     | Key | Value |
     |-----|-------|
     | `NODE_ENV` | `production` |
     | `MONGODB_URI` | `mongodb+srv://encircle_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/encircle?retryWrites=true&w=majority` |
     | `JWT_SECRET` | Generate a random string (use https://randomkeygen.com) |
     | `PORT` | `5000` |

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes first time)
   - Your backend will be at: `https://encircle-server.onrender.com`
   - **Save this URL!**

6. **Important: Update CORS Settings**
   - After you deploy frontend (next step), you'll get the Vercel URL
   - Go back to your code and update `server/index.js`:
     ```javascript
     const allowedOrigins = process.env.NODE_ENV === 'production' 
       ? ['https://your-actual-frontend.vercel.app'] // Replace this
       : ['http://localhost:3000'];
     ```
   - Commit and push to trigger redeployment

---

## 🌐 Step 3: Deploy Frontend to Vercel (Free Tier)

1. **Update Client Environment**
   - In your local project, create `client/.env.production`:
     ```env
     REACT_APP_API_URL=https://your-backend.onrender.com/api
     REACT_APP_SOCKET_URL=https://your-backend.onrender.com
     ```
   - Replace `your-backend` with your actual Render URL

2. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add production environment"
   git push origin main
   ```

3. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up with GitHub

4. **Import Project**
   - Click "Add New..." → "Project"
   - Import your `encircle-info` repository
   - Configure:
     - **Framework Preset**: Create React App
     - **Root Directory**: `client`
     - **Build Command**: `npm run build` (auto-detected)
     - **Output Directory**: `build` (auto-detected)

5. **Add Environment Variables**
   - Under "Environment Variables":
     
     | Name | Value |
     |------|-------|
     | `REACT_APP_API_URL` | `https://your-backend.onrender.com/api` |
     | `REACT_APP_SOCKET_URL` | `https://your-backend.onrender.com` |

6. **Deploy**
   - Click "Deploy"
   - Wait for build (2-5 minutes)
   - Your frontend will be at: `https://encircle-xyz123.vercel.app`
   - Vercel gives you a random URL, but you can customize it!

7. **Custom Domain (Optional)**
   - Go to Project Settings → Domains
   - Add your custom domain or change the Vercel subdomain

---

## 🔄 Step 4: Update Backend CORS with Frontend URL

Now that you have your Vercel URL, update the backend:

1. **Edit server/index.js**
   ```javascript
   const allowedOrigins = process.env.NODE_ENV === 'production' 
     ? ['https://your-actual-frontend.vercel.app'] // Use your real URL
     : ['http://localhost:3000'];
   ```

2. **Commit and Push**
   ```bash
   git add server/index.js
   git commit -m "Update CORS for production frontend"
   git push origin main
   ```

3. **Render will auto-deploy** (takes ~2 minutes)

---

## ✅ Step 5: Test Your Deployment

1. **Visit your Vercel URL**
   - Example: `https://encircle-xyz123.vercel.app`

2. **Register a new account**
   - Test the encryption key generation
   - This will test: Frontend → Backend → MongoDB

3. **Login and send a message**
   - Test real-time messaging
   - This will test: WebSocket connection, E2EE, Socket.io

4. **Check Security Logs**
   - Verify the security dashboard works

---

## 🐛 Troubleshooting

### Backend Not Connecting to MongoDB
- Check MongoDB Atlas network access (should be 0.0.0.0/0)
- Verify connection string has password and database name
- Check Render logs: Dashboard → Your Service → Logs

### CORS Errors
- Make sure Vercel URL is in `allowedOrigins` array
- Check that both frontend and backend are using HTTPS
- Verify environment variables are set correctly

### WebSocket Connection Failed
- Render free tier supports WebSockets ✅
- Make sure `REACT_APP_SOCKET_URL` uses your Render URL
- Check browser console for connection errors

### Render Service Sleeping
- Free tier services sleep after 15 minutes of inactivity
- First request takes ~30 seconds to wake up
- Consider using a free uptime monitor (https://uptimerobot.com)

---

## 💡 Important Notes

### Free Tier Limitations

**Render Free Tier:**
- Spins down after 15 minutes of inactivity
- 750 hours/month free (sufficient for one service)
- Slower performance than paid tiers
- Auto-deploys on git push

**Vercel Free Tier:**
- Unlimited bandwidth
- 100GB bandwidth/month
- Automatic SSL certificates
- Auto-deploys on git push

**MongoDB Atlas Free Tier:**
- 512MB storage
- Shared CPU
- No backups (export manually)
- Sufficient for thousands of users

### Security Recommendations

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secret**: Use a strong random string (32+ characters)
3. **MongoDB Password**: Use a strong password
4. **CORS**: Always restrict to your actual frontend URL in production
5. **API Keys**: Rotate secrets periodically

---

## 🔄 Continuous Deployment

Both Vercel and Render auto-deploy when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Your changes"
git push origin main

# Vercel and Render will automatically deploy!
```

---

## 📊 Monitoring

### Render Dashboard
- View logs in real-time
- Monitor service health
- Check deployment history

### Vercel Dashboard
- View build logs
- Monitor analytics
- Check deployment status

### MongoDB Atlas
- Monitor database metrics
- View connection stats
- Check storage usage

---

## 🎉 You're Live!

Your app is now deployed and accessible worldwide!

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.onrender.com`
- **Database**: MongoDB Atlas cluster

Share your app with friends and showcase it on your resume! 🚀

---

## 📝 Next Steps

1. **Custom Domain**: Add your own domain in Vercel
2. **Monitoring**: Set up UptimeRobot to keep Render awake
3. **Analytics**: Add Google Analytics to track usage
4. **SSL**: Already included! Both platforms provide free SSL
5. **Resume**: Add this project to showcase full-stack + security skills

---

## 💰 Cost Breakdown

| Service | Tier | Cost |
|---------|------|------|
| Vercel (Frontend) | Free | $0/month |
| Render (Backend) | Free | $0/month |
| MongoDB Atlas | M0 | $0/month |
| **Total** | | **$0/month** |

---

## 🆙 Upgrading (Optional)

When you're ready to scale:

- **Render Starter**: $7/month (no sleep, better performance)
- **Vercel Pro**: $20/month (team features, analytics)
- **MongoDB M10**: $0.08/hour (~$57/month) (backups, better performance)

But for learning and portfolios, the free tier is perfect! 🎓
