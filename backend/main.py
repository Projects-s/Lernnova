from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from docx import Document
import io
import zipfile
import csv
import json
import os
import google.generativeai as genai
from pydantic import BaseModel
from typing import List, Optional
import logging
import traceback
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("NEXT_PUBLIC_GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("Warning: GEMINI_API_KEY not found in environment variables")

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

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

        model = genai.GenerativeModel(GEMINI_MODEL, generation_config={"response_mime_type": "application/json"})
        response = model.generate_content(prompt)
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

        model = genai.GenerativeModel(GEMINI_MODEL, generation_config={"response_mime_type": "application/json"})
        response = model.generate_content(prompt)
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

        model = genai.GenerativeModel(GEMINI_MODEL, generation_config={"response_mime_type": "application/json"})
        response = model.generate_content(prompt)
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

        model = genai.GenerativeModel(GEMINI_MODEL, generation_config={"response_mime_type": "application/json"})
        response = model.generate_content(prompt)
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

        model = genai.GenerativeModel(GEMINI_MODEL, generation_config={"response_mime_type": "application/json"})
        response = model.generate_content(prompt)
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error in instagram analysis: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-suggestions")
async def generate_suggestions(profile: ProfileData):
    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        
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
        
        response = model.generate_content(prompt)
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error generating suggestions: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-roadmap")
async def generate_roadmap_endpoint(request: GoalRequest):
    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        
        context = to_json_str(request.profile)
        selected_goal = request.selectedGoal or "their most likely career goal based on data"
        
        pref_str = ""
        if request.preferences:
            pref_str = f"\n### USER PREFERENCES\n"
            for k, v in request.preferences.items():
                pref_str += f"- {k}: {v}\n"
        
        prompt = f"""
        Generate a comprehensive, lengthier, and highly detailed personalized learning roadmap from beginner to advanced to help the user reach the following goal: {selected_goal}. 
        The number of steps should scale from 4 up to 8 depending on their "Desired Pace" (relax/steady = more numerous, detailed steps; bootcamp = fewer, intensive steps).
        
        ### USER DATA
        {context}
        {pref_str}

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
        
        response = model.generate_content(prompt)
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error generating roadmap: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend-courses")
async def recommend_courses(request: CourseRecommendationRequest):
    try:
        # Deep thinking model with Google Search Grounding enabled
        model = genai.GenerativeModel(
            'gemini-3-flash-preview',
            tools=[{"google_search_retrieval": {}}]
        )
        
        # EXTRACT COMPACT PROFILE ONLY to save thousands of tokens
        compact_profile = {
            "skills": request.profile.skills,
            "interests": request.profile.interests,
            "strengths": request.profile.strengths
        }
        context = json.dumps(compact_profile)
        
        prompt = f"""
        You are an expert technical education advisor with access to comprehensive internet knowledge. 
        The user's SPECIFIC career goal is: "{request.goal}". 
        CRITICAL: Do NOT provide generic suggestions. Every single course MUST be 100% relevant to this exact niche goal. If the goal is "IoT Solutions Architect", do not suggest a generic "Meta Full-Stack Developer" course unless you explicitly explain how it applies to IoT.
        Their target learning platform is: "{request.platform}".
        
        ### USER SUMMARY (Skills & Interests)
        {context}
        
        Search your deep knowledge base and recommend the top 5 BEST, most highly-rated, and 100% relevant courses on {request.platform} for the goal "{request.goal}".
        
        EXTREME CRITICAL RULES:
        1. RELEVANCE: You MUST NOT suggest a generic course (e.g., "Full Stack Web Development") if the user's goal is specific (e.g., "IoT Solutions Architect"). If you cannot find a highly specific match, do not include it. The course MUST contain material directly related to the exact goal.
        2. VERIFICATION: Only suggest real, verified courses that you know exist with high certainty. Do not hallucinate course names.
        3. LINKS (NO 404s!): DO NOT guess the course's direct URL or domain slug. Instead, ALWAYS return a verified search URL that is guaranteed to work.
           - Coursera: https://www.coursera.org/search?query={{URL_ENCODED_COURSE_NAME}}
           - Udemy: https://www.udemy.com/courses/search/?src=ukw&q={{URL_ENCODED_COURSE_NAME}}
           - YouTube: https://www.youtube.com/results?search_query={{URL_ENCODED_COURSE_NAME}}
        4. REVIEWS: You MUST explicitly state the general rating and review volume in the description (e.g. "Rated 4.8 with 10k+ reviews"). You MUST perform a Google Search to verify this rating.
        5. MODULES: You MUST provide an accurate count of the number of modules/weeks in the courses. You MUST perform a Google Search to verify this count.
        
        Return a JSON array of exactly 5 objects:
        [
            {{
                "id": "course_1",
                "title": "Exact Course Name (e.g., 'Deep Learning Specialization')",
                "provider": "{request.platform}",
                "instructor": "Instructor or University Name",
                "description": "2-sentence compelling description of why it fits their SPECIFIC goal. Mention its high ratings/reviews.",
                "modules": 10,
                "link": "The safe search query URL as specified above."
            }}
        ]
        """
        
        response = model.generate_content(prompt)
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error recommending courses: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat-mentor")
async def chat_mentor(request: ChatRequest):
    try:
        model = genai.GenerativeModel(GEMINI_MODEL, generation_config={"response_mime_type": "application/json"})
        
        context = json.dumps(request.profile)
        history_str = "\n".join([f"{'User' if h.get('role') == 'user' else 'Mentor'}: {h.get('content')}" for h in request.history])

        prompt = f"""
        You are the "Lernova Mentor", a high-end career coach, technical expert, and personalized learning assistant.
        You must be able to answer ALL kinds of questions, including deep technical questions, hardware troubleshooting, coding queries, and career advice.
        
        ### USER ANALYZED PROFILE (Context)
        {context}

        ### CONVERSATION HISTORY
        {history_str}

        ### NEW USER MESSAGE
        "{request.message}"

        ### INSTRUCTIONS
        1. FIRST, analyze the user's question. If it is a technical question (e.g., "connect a motor to an esp32"), answer it directly and thoroughly. You are an expert in all technical domains.
        2. Keep the user's profile in mind. If their profile/context is relevant to their question, use it to personalize your answer. However, DO NOT force their profile into the answer if it's a general technical question.
        3. Provide a helpful, encouraging, and highly specific response.
        4. Reference their actual skills or interests if it helps structure the answer, but avoid generic references.
        5. If they ask for a path or goals, suggest concrete steps.
        6. If they state they finished a current step or ask to move on, you MUST update the roadmap progress. Mark old steps as "completed" and open up the next step as "current".
        7. VERY IMPORTANT: If you suggest a roadmap update, you MUST preserve or generate the "tasks" array (with type and resource) inside each step, otherwise they will be deleted from the UI!

        Return a JSON object:
        {{
            "message": "Your main response text here...",
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
        
        response = model.generate_content(prompt)
        text = extract_json(response.text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error in mentor chat: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
