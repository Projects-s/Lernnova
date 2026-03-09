from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from docx import Document
import io
import zipfile
import csv
import json
import os
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List, Optional
import logging
import traceback
import hashlib
from dotenv import load_dotenv
from notebooklm_utils import generate_notebooklm_artifact, get_generation_meta

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_roadmap_id(roadmap: dict) -> str:
    """Derive a stable roadmap ID, hashing the goal if the ID is missing."""
    rid = roadmap.get("id")
    if rid:
        return str(rid)
    goal = roadmap.get("careerGoal", "temp")
    created = roadmap.get("createdAt", "")
    return hashlib.md5(f"{goal}_{created}".encode()).hexdigest()[:10]

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("NEXT_PUBLIC_GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
LONG_CONTEXT_MODEL = os.getenv("LONG_CONTEXT_MODEL", "gemini-3-flash-preview")

app = FastAPI()

class ProfileData(BaseModel):
    youtube: Optional[dict] = None
    github: Optional[dict] = None
    reddit: Optional[dict] = None
    instagram: Optional[dict] = None
    document: Optional[dict] = None
    interests: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    strengths: Optional[List[str]] = []

class GoalRequest(BaseModel):
    profile: ProfileData
    selectedGoal: Optional[str] = None
    preferences: Optional[dict] = None
    additionalContext: Optional[str] = None

class CourseRecommendationRequest(BaseModel):
    goal: str
    platform: str
    profile: ProfileData

class AnalyzeRequest(BaseModel):
    data: dict

class ChatRequest(BaseModel):
    profile: dict
    history: list
    message: str

class StepExplanationRequest(BaseModel):
    stepTitle: str
    taskTitle: str
    careerGoal: str
    profile: ProfileData

@app.post("/generate-step-explanation")
async def generate_step_explanation(request: StepExplanationRequest):
    try:
        context = to_json_str(request.profile)
        
        prompt = f"""
        You are an expert tutor on Lernova. Provide a deep, structured, and pedagogical explanation for the following learning task:
        Career Goal: {request.careerGoal}
        Roadmap Pillar: {request.stepTitle}
        Specific Learning Task: {request.taskTitle}
        
        ### USER CONTEXT (Analyze their interests/skills to personalize the analogies)
        {context}
        
        ### INSTRUCTIONS
        Create a high-impact, technical tutorial. Break it down into 5-7 bite-sized "Knowledge Blocks".
        For each block:
        1. "heading": A short, punchy technical sub-title (max 5 words).
        2. "content": Exactly ONE deep technical paragraph (about 3-5 sentences). Do not use multiple paragraphs in one block. Use technical depth appropriate for someone pursuing this specific goal.
        
        The goal is to provide a "milestone-based" reading experience where the user can mark off each specific concept as they finish reading it.
        
        Return a JSON array of blocks exactly matching this schema:
        [
            {{
                "heading": "...",
                "content": "...",
                "read": false
            }}
        ]
        """
        
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error generating step explanation: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def to_json_str(model):
    if hasattr(model, "model_dump_json"):
        return model.model_dump_json()
    return model.json()

def extract_json(text):
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    return text.strip()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "lernova-backend"}

@app.post("/upload-doc")
async def upload_document(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
        
    filename = file.filename
    content_type = file.content_type
    content = await file.read()
    
    text = ""
    
    try:
        if filename.endswith(".pdf") or "pdf" in content_type:
            pdf_reader = PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        elif filename.endswith(".docx") or "wordprocessing" in content_type:
            doc = Document(io.BytesIO(content))
            for para in doc.paragraphs:
                text += para.text + "\n"
        elif filename.endswith(".txt") or "text" in content_type:
            text = content.decode("utf-8")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
            
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="No readable text found in document")
            
        return {
            "fileName": filename,
            "fileSize": len(content),
            "extractedText": text
        }
    except Exception as e:
        print(f"Error parsing document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-reddit-zip")
async def upload_reddit_zip(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    filename = file.filename
    if not filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip Reddit export files are supported")
        
    content = await file.read()
    subreddits = []
    karma_estimate = 0
    
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            # Parse subreddits
            if 'subscribed_subreddits.csv' in z.namelist():
                with z.open('subscribed_subreddits.csv') as f:
                    csv_data = f.read().decode('utf-8').splitlines()
                    reader = csv.reader(csv_data)
                    next(reader, None) # skip header
                    for row in reader:
                        if row and row[0].strip():
                            subreddits.append({"name": row[0].strip()})
                            
            # Parse post votes for karma estimation mock
            if 'post_votes.csv' in z.namelist():
                with z.open('post_votes.csv') as f:
                    csv_data = f.read().decode('utf-8').splitlines()
                    vote_count = max(0, len(csv_data) - 1)
                    karma_estimate = vote_count * 15 # rough estimate of engagement relative to karma

            # Optionally parse comments.csv for deeper text analytics
            
        return {
            "subreddits": subreddits,
            "profile": {
                "total_karma": karma_estimate,
                "name": "Reddit User Export"
            }
        }
    except Exception as e:
        print(f"Error parsing Reddit zip: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse Reddit export file")

@app.post("/upload-instagram-zip")
async def upload_instagram_zip(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    filename = file.filename
    if not filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip Instagram export files are supported")
        
    content = await file.read()
    following = []
    ad_interests = []
    advertisers = []
    likes_count = 0
    
    print(f"Starting parse for {filename}")
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            for name in z.namelist():
                if name.endswith('.json'):
                    try:
                        with z.open(name) as f:
                            data = json.loads(f.read().decode('utf-8'))
                            
                            name_low = name.lower()
                            if 'following' in name_low:
                                items = []
                                if isinstance(data, dict) and 'relationships_following' in data:
                                    items = data['relationships_following']
                                elif isinstance(data, list):
                                    items = data
                                    
                                for item in items:
                                    user_val = item.get('title')
                                    if (not user_val or user_val == "") and 'string_list_data' in item and len(item['string_list_data']) > 0:
                                        user_val = item['string_list_data'][0].get('value')
                                    if user_val:
                                        following.append({"username": user_val})
                            
                            elif 'followers' in name_low:
                                items = []
                                if isinstance(data, dict) and 'relationships_followers' in data:
                                    items = data['relationships_followers']
                                elif isinstance(data, list):
                                    items = data
                                    
                                for item in items:
                                    user_val = item.get('title')
                                    if (not user_val or user_val == "") and 'string_list_data' in item and len(item['string_list_data']) > 0:
                                        user_val = item['string_list_data'][0].get('value')
                                    if user_val:
                                        if not any(f['username'] == user_val for f in following):
                                            following.append({"username": user_val})
                            
                            elif 'recommended_topics' in name_low and isinstance(data, dict):
                                if 'topics_your_topics' in data:
                                    for item in data['topics_your_topics']:
                                        if 'string_map_data' in item and 'Name' in item['string_map_data']:
                                            ad_interests.append(item['string_map_data']['Name'].get('value'))
                            
                            elif 'advertisers_using_your_activity' in name_low and isinstance(data, dict):
                                if 'ig_custom_audiences_all_types' in data:
                                    for item in data['ig_custom_audiences_all_types']:
                                        if 'advertiser_name' in item:
                                            advertisers.append(item['advertiser_name'])
                            
                            elif 'liked_posts' in name_low or 'media_likes' in name_low:
                                if isinstance(data, dict) and 'likes_media_likes' in data:
                                    likes_count += len(data['likes_media_likes'])
                                elif isinstance(data, list):
                                    likes_count += len(data)
                                    
                    except Exception as inner_e:
                        print(f"Skipping JSON parsing for {name}: {inner_e}")
                        pass
        
        print(f"Parse complete: {len(following)} social points, {len(ad_interests)} ad topics, {len(advertisers)} advertisers")
        
        return {
            "following": following[:400], 
            "ad_interests": ad_interests,
            "advertisers": advertisers[:200],
            "profile": {
                "likes_count": likes_count,
                "name": "Instagram User Export"
            }
        }
    except Exception as e:
        print(f"Error parsing Instagram zip: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse Instagram export file")

@app.post("/analyze/youtube")
async def analyze_youtube(request: AnalyzeRequest):
    try:
        yt_data = request.data
        liked_videos = "\n".join([f'- "{v.get("title")}" (Duration: {v.get("duration")})' for v in yt_data.get("likedVideos", [])[:50]])
        subscriptions = ", ".join([s.get("title") for s in yt_data.get("subscriptions", [])])

        prompt = f"""
        You are an expert data analyst categorizing video content themes.
        Analyze the following YouTube subscriptions and liked videos to determine the primary interests, implied skills, and learning format preferences of the user.
        
        ### YOUTUBE DATA
        **Subscriptions:** {subscriptions}
        **Recently Liked Videos:** {liked_videos}

        ### INSTRUCTIONS
        Extract a profile based uniquely on this YouTube data in the exact JSON structure below.
        1. **interests**: High-level topics (e.g., "Filmmaking", "History", "Physics").
        2. **skills**: Implied skills derived from the content (e.g., "Video Editing", "Science Communication").
        3. **learningStyle**: 
           - "format": "Visual" | "Auditory" | "Practical"
           - "depth": "Deep Diver" | "Broad Explorer"
           - "reasoning": A single sentence explaining why based on their videos.
        4. **personalityTraits**: 5 adjectives (e.g., "Curious", "Creative").
        5. **suggestedCareers**: 3 broad career paths perfectly aligned with these interests and skills.

        Return ONLY a valid JSON object matching this schema:
        {{
            "interests": ["...", "..."],
            "skills": ["...", "..."],
            "learningStyle": {{
                "format": "Visual",
                "depth": "Deep Diver",
                "reasoning": "Reasoning here"
            }},
            "personalityTraits": ["...", "..."],
            "suggestedCareers": ["...", "..."]
        }}"""

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error in youtube analysis: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/github")
async def analyze_github(request: AnalyzeRequest):
    try:
        gh_data = request.data
        languages = ", ".join(gh_data.get("languages", []))
        own_repos = "\n".join([f'- {r.get("name")} ({r.get("language")}): {r.get("description")}' for r in gh_data.get("ownRepos", [])[:15]])

        prompt = f"""
        You are an expert technical recruiter and engineering manager.
        Analyze the following GitHub profile to determine the developer's technical skills, core focus areas, and development style.
        
        ### GITHUB DATA
        - Top Languages Used: {languages}
        **Repositories Created:**
        {own_repos}

        ### INSTRUCTIONS
        Extract a profile based uniquely on this GitHub data in the exact JSON structure below.
        1. **interests**: High-level development areas (e.g., "Web Dev", "Machine Learning", "Systems Programming").
        2. **skills**: Hard technical skills and frameworks (e.g., "React", "Rust", "API Design").
        3. **learningStyle**: 
           - "format": "Practical" | "Theoretical"
           - "depth": "Deep Diver" | "Broad Explorer"
           - "reasoning": A single sentence explaining why.
        4. **suggestedCareers**: 3 modern job titles that fit this tech stack.

        Return ONLY a valid JSON object matching this schema:
        {{
            "interests": ["...", "..."],
            "skills": ["...", "..."],
            "learningStyle": {{
                "format": "Practical",
                "depth": "Deep Diver",
                "reasoning": "Reason here"
            }},
            "suggestedCareers": ["Frontend Engineer", "DevOps"]
        }}"""

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error in github analysis: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/reddit")
async def analyze_reddit(request: AnalyzeRequest):
    try:
        rd_data = request.data
        subreddits = ", ".join([s.get("name") for s in rd_data.get("subreddits", [])[:50]])

        prompt = f"""
        You are an expert community analyst and sociologist.
        Analyze the following list of Reddit subscriptions to infer the user's niche hobbies, personal interests, and domain knowledge.
        
        ### REDDIT DATA
        **Subscribed Communities:**
        {subreddits}

        ### INSTRUCTIONS
        Extract a profile based uniquely on this Reddit data in the exact JSON structure below.
        1. **interests**: High-level hobbies and topics (e.g., "Personal Finance", "Gaming", "Fitness").
        2. **skills**: Soft skills or niche knowledge domains implied by the communities (e.g., "Financial Literacy", "Hardware Troubleshooting").
        3. **personalityTraits**: 5 adjectives (e.g., "Analytical", "Community-oriented").
        4. **suggestedCareers**: 3 broad career paths that align with these hobbies and traits.

        Return ONLY a valid JSON object matching this schema:
        {{
            "interests": ["...", "..."],
            "skills": ["...", "..."],
            "personalityTraits": ["...", "..."],
            "suggestedCareers": ["...", "..."]
        }}"""

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error in reddit analysis: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/document")
async def analyze_document(request: AnalyzeRequest):
    try:
        doc_data = request.data
        text_content = doc_data.get("extractedText", "")[:30000]

        prompt = f"""
        You are an expert HR recruiter and career coach analyzing a user's resume, CV, or professional document.
        Analyze the following extracted text to determine the candidate's core professional domains, technical/soft skills, and suggested career trajectories.
        
        ### DOCUMENT TEXT
        {text_content}

        ### INSTRUCTIONS
        Extract a profile based uniquely on this text in the exact JSON structure below.
        1. **interests**: Core professional domains and industries (e.g., "Fintech", "Cloud Infrastructure", "Product Design").
        2. **skills**: Hard and soft skills found or clearly implied in the text (e.g., "Python", "Project Management", "Leadership").
        3. **learningStyle**: 
           - "format": "Practical" | "Theoretical" | "Visual"
           - "depth": "Deep Diver" | "Broad Explorer"
           - "reasoning": A single sentence explaining why based on the depth of their documented experience.
        4. **suggestedCareers**: 3 broad career paths that perfectly align with this resume.

        Return ONLY a valid JSON object matching this schema:
        {{
            "interests": ["...", "..."],
            "skills": ["...", "..."],
            "learningStyle": {{
                "format": "Practical",
                "depth": "Deep Diver",
                "reasoning": "Reason here"
            }},
            "suggestedCareers": ["...", "..."]
        }}"""

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error in document analysis: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/instagram")
async def analyze_instagram(request: AnalyzeRequest):
    try:
        ig_data = request.data
        following_str = ", ".join([f.get("username", "") for f in ig_data.get("following", [])])
        ad_interests_str = ", ".join(ig_data.get("ad_interests", []))
        advertisers_str = ", ".join(ig_data.get("advertisers", []))
        likes_count = ig_data.get("profile", {}).get("likes_count", 0)

        prompt = f"""
        You are an expert consumer behavioral analyst and social psychologist.
        Analyze the following list of Instagram accounts the user follows, their algorithmic Ad Interests, and the list of Advertisers who have uploaded the user's data to infer their lifestyle, hobbies, and domain knowledge.
        
        ### INSTAGRAM DATA
        **Followed Accounts (Sample):**
        {following_str}
        
        **Algorithmic Ad Interests:**
        {ad_interests_str}

        **Advertisers Tracking User:**
        {advertisers_str}

        **Engagement Metrics:**
        - Total Likes Recorded: {likes_count}

        ### INSTRUCTIONS
        Extract a profile based uniquely on this Instagram data in the exact JSON structure below.
        1. **interests**: High-level hobbies, visual aesthetics, and lifestyle topics (e.g., "Fitness", "Streetwear", "Digital Art").
        2. **skills**: Soft skills or niche consumer knowledge domains implied by their aesthetic or algorithmic interests (e.g., "Trend Analysis", "Visual Curation").
        3. **personalityTraits**: 5 adjectives describing their likely behavioral profile.
        4. **suggestedCareers**: 3 broad career paths perfectly aligned with these specific visual and lifestyle sensibilities.

        Return ONLY a valid JSON object matching this schema:
        {{
            "interests": ["...", "..."],
            "skills": ["...", "..."],
            "personalityTraits": ["...", "..."],
            "suggestedCareers": ["...", "..."]
        }}"""

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error in instagram analysis: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-suggestions")
async def generate_suggestions(profile: ProfileData):
    try:
        context = to_json_str(profile)
        
        prompt = f"""
        You are a high-level strategic career architect. 
        Analyze the user's pulse through their multi-platform digital footprint. 
        IMPORTANT: Weigh source-specific data accordingly:
        - GitHub/Docs: High weight for hard technical skills and professional focus.
        - YouTube/Reddit: High weight for intellectual interests and niche domain knowledge.
        - Instagram: Insight into aesthetics, lifestyle, and visual persona.

        ### USER DATA (Multi-Platform Analysis)
        {context}

        Extract 4 distinct and high-probability career trajectories or life-goals. 
        Ensure you explain the specific cross-platform "triangulation" that led to each goal (e.g., "Combining your GitHub React skills with your Reddit Fintech interests").

        Return a JSON object:
        {{
            "suggestions": [
                {{
                    "title": "Job Title 1",
                    "reason": "Specific cross-platform reasoning",
                    "difficulty": "Entry/Intermediate/Advanced"
                }}
            ]
        }}
        """
        
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error generating suggestions: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-roadmap")
async def generate_roadmap_endpoint(request: GoalRequest):
    try:
        context = to_json_str(request.profile)
        selected_goal = request.selectedGoal or "their most likely career goal based on data"
        
        pref_str = ""
        if request.preferences:
            pref_str = f"\n### USER PREFERENCES\n"
            for k, v in request.preferences.items():
                pref_str += f"- {k}: {v}\n"
        
        extra_context_str = ""
        if request.additionalContext:
            extra_context_str = f"\n### ADDITIONAL USER INSTRUCTIONS\n{request.additionalContext}\n"
        
        prompt = f"""
        Generate a comprehensive, lengthier, and highly detailed personalized learning roadmap from beginner to advanced to help the user reach the following goal: {selected_goal}. 
        The number of steps should scale from 4 up to 8 depending on their "Desired Pace" (relax/steady = more numerous, detailed steps; bootcamp = fewer, intensive steps).
        
        ### USER DATA
        {context}
        {pref_str}
        {extra_context_str}

        Make sure the learning journey perfectly aligns with their profile AND their stated learning preferences.
        Critically: Break down each roadmap step into 3-5 specific micro-tasks. 
        
        - LEARNING APPROACH: The specific wording, language style, and concepts taught should explicitly reflect their "Learning Approach" preference (e.g., highly technical and project/code-based if "Practical", or highly conceptual and academic if "Theoretical").
        - LEARNING FORMAT: 
            - If their preference is "Visual & Interactive", explicitly provide specific YouTube video titles, channel names, or search terms as the resource, and set task type to "video".
            - If their preference is "Auditory / Podcasts", explicitly recommend specific podcast episodes or audio lectures, and set task type to "audio".
            - If their preference is "Text-based & Documentation", explicitly provide deep explanatory steps, articles, reading materials, or documentation links, and set task type to "article".

        Return a JSON object:
        {{
            "careerGoal": "{selected_goal if request.selectedGoal else "Generated Goal Name"}",
            "reason": "A 2-sentence explanation of why this specific path matches their skills and interests",
            "steps": [
                {{
                    "id": "1", 
                    "title": "Foundation Step Name", 
                    "status": "current",
                    "tasks": [
                        {{
                            "id": "t1",
                            "title": "Specific action, reading, or project to build",
                            "type": "video", // MUST BE "video", "article", "audio", or "project"
                            "resource": "Specific title to search like 'YouTube: FreeCodeCamp React Crash Course' or 'Podcast: Lex Fridman #123'"
                        }}
                    ]
                }},
                {{
                    "id": "2", 
                    "title": "Next Step Name", 
                    "status": "locked",
                    "tasks": [] // Same format as above
                }},
                // Continue generating steps up to 8 depending on pace...
                {{
                    "id": "N", 
                    "title": "Advanced/Portfolio Step Name", 
                    "status": "locked",
                    "tasks": [] // Same format as above
                }}
            ]
        }}
        """
        
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error generating roadmap: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend-courses")
async def recommend_courses(request: CourseRecommendationRequest):
    try:
        # EXTRACT COMPACT PROFILE ONLY to save thousands of tokens
        compact_profile = {
            "skills": request.profile.skills,
            "interests": request.profile.interests,
            "strengths": request.profile.strengths
        }
        context = json.dumps(compact_profile)
        
        prompt = f"""
        You are a world-class educational consultant. Your mission is to PINPOINT the top 5 absolute best, highest-quality learning resources for a specific niche goal.
        
        The user's EXACT career goal is: "{request.goal}".
        The target platform is: "{request.platform}".
        
        ### USER PROFILE (Context)
        {context}
        
        ### MISSION
        Find 5 specific, high-impact courses or playlists that will take the user from their current level to mastery in "{request.goal}". 
        Avoid generic "intro to programming" courses unless strictly necessary for this specific path.
        
        ### EXTREME PINPOINTING RULES:
        1. RELEVANCE: Every recommendation must be directly tied to "{request.goal}". If the goal is "LLM Generation", do not suggest as generic "Python for Beginners" course. Suggest "Advanced LLM Fine-tuning with PyTorch" instead.
        2. VERIFICATION: Use your search tool to confirm the courses are currently active, highly-rated (4.5+ or equivalent), and have significant enrollment.
        3. LINKS: To ensure the links never break (404s), follow these platform-specific search query formats:
           - Coursera: https://www.coursera.org/search?query={{URL_ENCODED_COURSE_NAME}}
           - Udemy: https://www.udemy.com/courses/search/?src=ukw&q={{URL_ENCODED_COURSE_NAME}}
           - YouTube: https://www.youtube.com/results?search_query={{URL_ENCODED_COURSE_NAME}}
           
        4. DESCRIPTIONS: Write a 3-sentence powerful justification for why THIS specific course is the perfect "Deep Dive" for their goal.
        5. RATINGS: Mention the rating and number of reviews in the description (e.g. "Rated 4.9 by 15k+ professionals").
        6. MODULES: Provide an accurate count of modules or weeks.
        
        Return a JSON array of exactly 5 objects:
        [
            {{
                "id": "course_1",
                "title": "Pinpointed Course Title (e.g. 'Natural Language Processing Specialization')",
                "provider": "{request.platform}",
                "instructor": "Specific University or Instructor Name",
                "description": "Specific reasoning: Why this fits their goal + Verified Rating/Reviews.",
                "modules": 8,
                "link": "The safe search query URL as specified above."
            }}
        ]
        """
        
        response = client.models.generate_content(
            model=LONG_CONTEXT_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearchRetrieval())]
            )
        )
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error recommending courses: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat-mentor")
async def chat_mentor(request: ChatRequest):
    try:
        context = json.dumps(request.profile)
        history_str = "\n".join([f"{'User' if h.get('role') == 'user' else 'Mentor'}: {h.get('content')}" for h in request.history])

        prompt = f"""
        You are the "Lernova Mentor", a high-end career coach, technical expert, and personalized learning assistant.
        You must be able to answer ALL kinds of questions, including deep technical questions, hardware troubleshooting, coding queries, and career advice.
        
        ### USER ANALYZED PROFILE & CURRENT ROADMAP PROGRESS (Context)
        {context}

        ### CONVERSATION HISTORY
        {history_str}

        ### NEW USER MESSAGE
        "{request.message}"

        ### YOUR SPECIFIC ABILITIES
        1. PROGRESS TRACKING: You have access to the user's "activeRoadmap". When they ask about progress, check "activeRoadmap.steps". 
           - Count specifically how many tasks are "completed" across all steps or in the current one.
           - Mention specifically what "is next" by looking at the first "locked" or "current but incomplete" step.
        2. COURSE GUIDANCE: You can see the "courses" object inside "activeRoadmap". If they've generated Coursera/Udemy/YouTube recommendations, talk about them by name and explain how they fit their niche goal.
        3. ROADMAP UPDATES: If the user indicates they finished a task or step, you can suggest a "suggestedRoadmapUpdate" to mark steps as "completed" and unlock the next ones.
        4. TECHNICAL DEPTH: If they ask how to do something (e.g., "how to use PyTorch"), answer it directly with expert-level detail.

        ### INSTRUCTIONS
        - FORMATTING: Use Markdown for professional structure.
        - **BOLDING IS MANDATORY**: You MUST wrap all technical terms, tool names, course titles, and milestones in **double asterisks** (e.g., **PyTorch**, **Step 1**, **Completed**).
        - **STRICT RULE**: NEVER use single quotes (') for emphasis. If you want to highlight something, use **BOLD**. 
        - **LISTS**: Use bullet points for any lists of steps or progress items.
        - **VOICE**: Authoritative, technical, yet encouraging. Personalize using their `activeRoadmap`.

        Return a JSON object:
        {{
            "message": "Your Markdown response here (use **bold**, NOT single quotes)...",
            "suggestedRoadmapUpdate": null | [
                {{
                    "id": "1", 
                    "title": "Step Name", 
                    "status": "completed", // or "current" or "locked"
                    "tasks": [
                        {{
                            "id": "t1", 
                            "title": "Specific micro task", 
                            "type": "video", // or "project" or "article" or "audio" 
                            "resource": "Specific target like YouTube video name or Podcast episode"
                        }}
                    ]
                }}
            ]
        }}
        """
        
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error in mentor chat: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-podcast")
async def generate_podcast(request: dict, background_tasks: BackgroundTasks):
    try:
        roadmap = request.get("roadmap")
        user_id = request.get("userId")
        user_profile = request.get("userProfile")
        
        if not roadmap or not user_id:
            raise HTTPException(status_code=400, detail="Missing roadmap or userId")
            
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(backend_dir)
        public_dir = os.path.join(project_root, "public", "podcasts")
        os.makedirs(public_dir, exist_ok=True)
        
        roadmap_id = get_roadmap_id(roadmap)
        filename = f"podcast_{user_id}_{roadmap_id}.mp3"
        output_path = os.path.join(public_dir, filename)
        
        if os.path.exists(output_path):
            return {"status": "ready", "audioUrl": f"/podcasts/{filename}"}

        # Start the generation in the background
        background_tasks.add_task(generate_notebooklm_artifact, roadmap, output_path, "audio", user_profile, user_id)
        
        return {
            "status": "processing", 
            "message": "Podcast generation started in background.",
            "checkUrl": f"/check-podcast?userId={user_id}&roadmapId={roadmap_id}"
        }
    except Exception as e:
        logger.error(f"Error in generate_podcast: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-video")
async def generate_video(request: dict, background_tasks: BackgroundTasks):
    try:
        roadmap = request.get("roadmap")
        user_id = request.get("userId")
        user_profile = request.get("userProfile")
        
        if not roadmap or not user_id:
            raise HTTPException(status_code=400, detail="Missing roadmap or userId")
            
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(backend_dir)
        public_dir = os.path.join(project_root, "public", "videos")
        os.makedirs(public_dir, exist_ok=True)
        
        roadmap_id = get_roadmap_id(roadmap)
        filename = f"video_{user_id}_{roadmap_id}.mp4"
        output_path = os.path.join(public_dir, filename)
        
        if os.path.exists(output_path):
            return {"status": "ready", "videoUrl": f"/videos/{filename}"}

        # Start the generation in the background
        background_tasks.add_task(generate_notebooklm_artifact, roadmap, output_path, "video", user_profile, user_id)
        
        return {
            "status": "processing", 
            "message": "Video generation started in background. This will take about 5-10 minutes.",
            "checkUrl": f"/check-video?userId={user_id}&roadmapId={roadmap_id}"
        }
    except Exception as e:
        logger.error(f"Error in generate_video: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/check-video")
async def check_video(userId: str, roadmapId: str):
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(backend_dir)
    filename = f"video_{userId}_{roadmapId}.mp4"
    public_path = os.path.join(project_root, "public", "videos", filename)
    
    meta = get_generation_meta(public_path)
    
    if os.path.exists(public_path):
        return {"status": "ready", "videoUrl": f"/videos/{filename}", "meta": meta}
    
    if not meta:
        return {"status": "not_started", "message": "No generation has been started for this video yet."}

    if meta.get("status") == "failed":
        return {"status": "failed", "message": meta.get("error", "Generation failed"), "meta": meta}
        
    return {"status": "processing", "message": "Video is still being generated...", "meta": meta}

@app.get("/check-podcast")
async def check_podcast(userId: str, roadmapId: str):
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(backend_dir)
    filename = f"podcast_{userId}_{roadmapId}.mp3"
    public_path = os.path.join(project_root, "public", "podcasts", filename)
    
    meta = get_generation_meta(public_path)
    
    if os.path.exists(public_path):
        return {"status": "ready", "audioUrl": f"/podcasts/{filename}", "meta": meta}
    
    if not meta:
        return {"status": "not_started", "message": "No generation has been started for this podcast yet."}

    if meta.get("status") == "failed":
        return {"status": "failed", "message": meta.get("error", "Generation failed"), "meta": meta}
        
    return {"status": "processing", "message": "Podcast is still being generated...", "meta": meta}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
