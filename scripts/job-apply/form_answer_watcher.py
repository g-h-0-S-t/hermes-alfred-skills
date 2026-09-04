#!/usr/bin/env python3
"""Form Answer Watcher: reads _form_questions.json, answers via Hermes API, writes _form_answers.json"""
import json, os, time, sys

QUESTION_FILE = 'XXXXXXX/job-apply/_form_questions.json'
ANSWER_FILE = 'XXXXXXX/job-apply/_form_answers.json'

def get_answer_from_hermes(question, profile):
    """Get answer from Hermes agent's LLM"""
    # Use the Hermes agent's own reasoning
    # For now, use a simple lookup based on profile facts
    q = question.lower()
    label = question
    
    # Structured fields
    if 'current' in q and ('salary' in q or 'ctc' in q or 'compensation' in q):
        return '86' if 'lpa' in q else 'XXXXXXX'
    if 'expected' in q and ('salary' in q or 'ctc' in q or 'compensation' in q):
        return '50' if 'lpa' in q else 'XXXXXXX'
    if 'total' in q and ('experience' in q or 'exp' in q):
        return '14'
    if 'notice period' in q:
        return '0'
    if 'hours' in q and ('week' in q or 'per week' in q):
        return '40'
    if 'how many years' in q or 'years of' in q or 'years experience' in q:
        skills = profile.get('skills', {})
        for skill in skills:
            if skill.lower() in q:
                return str(skills[skill])
        return '0'
    
    # Location
    if 'location' in q or 'city' in q or 'where' in q:
        return 'XXXXXXX, Karnataka, XXXXXXX'
    
    # Yes/No questions
    if q.startswith('are you') or q.startswith('do you') or q.startswith('can you'):
        if 'sponsor' in q or 'visa' in q:
            return 'No'
        if 'authorize' in q or 'legally' in q or 'right to work' in q:
            return 'Yes'
        if 'relocate' in q and ('to' in q or 'willing' in q):
            if 'XXXXXXX' in q or 'XXXXXXXX' in q:
                return 'Yes'
            return 'Yes'  # Open to relocate within XXXXXXX
    
    # Employer
    if 'employer' in q or 'company' in q or 'current role' in q:
        return 'Stealth'
    
    # Education
    if 'bachelor' in q or 'undergraduate' in q or 'b.tech' in q or 'b.e.' in q:
        return "Bachelor's Degree"
    if 'master' in q or 'postgraduate' in q or 'm.tech' in q:
        return "Master's Degree"
    if 'high school' in q or 'class 12' in q:
        return 'High School'
    if 'phd' in q or 'doctorate' in q:
        return 'No'
    
    # English fluency
    if 'english' in q and ('fluent' in q or 'proficien' in q or 'speak' in q):
        return 'Yes'
    
    # Notice period
    if 'notice' in q:
        return '0'
    
    # Relocation
    if 'relocat' in q or 'willing to move' in q:
        return 'Yes'
    
    # Join immediately
    if 'join' in q and ('immediate' in q or 'soon' in q or 'when' in q):
        return 'Yes'
    
    # Work authorization
    if 'authorized to work' in q or 'legally authorized' in q:
        return 'Yes'
    
    # Sponsorship
    if 'sponsorship' in q or 'sponsor' in q:
        return 'No'
    
    # Background check
    if 'background check' in q:
        return 'Yes'
    
    # Remote work
    if 'remote' in q or 'work from home' in q:
        return 'Yes'
    
    # Driver's license
    if 'driver' in q or 'driving' in q:
        return 'No'
    
    # AI tools
    if 'ai tool' in q or 'which ai' in q or 'tools do you use' in q:
        return 'Hermes, omniroute, Antigravity, Kilo Code, Cursor, Ollama/LM Studio'
    
    # GitHub/portfolio
    if 'github' in q or 'portfolio' in q or 'project' in q:
        return 'https://github.com/YOUR_GITHUB_USERNAME'
    
    # LinkedIn
    if 'linkedin' in q:
        return 'https://linkedin.com/in/OPERATOR_LINKEDIN_ID'
    
    # Website
    if 'website' in q or 'url' in q:
        return 'https://OPERATOR_LINKEDIN_ID.portfolio.example.com'
    
    # Consent/agreement
    if 'consent' in q or 'agree' in q or 'terms' in q or 'privacy' in q:
        return 'Yes'
    
    # Default
    return None

def main():
    print("Form Answer Watcher started")
    last_timestamp = 0
    
    while True:
        try:
            if not os.path.exists(QUESTION_FILE):
                time.sleep(2)
                continue
            
            with open(QUESTION_FILE, 'r') as f:
                data = json.load(f)
            
            timestamp = data.get('timestamp', 0)
            if timestamp == last_timestamp:
                time.sleep(2)
                continue
            
            last_timestamp = timestamp
            questions = data.get('questions', [])
            profile = data.get('profile', {})
            
            if not questions:
                time.sleep(2)
                continue
            
            print(f"Processing {len(questions)} questions...")
            
            answers = {}
            for q in questions:
                label = q.get('label', '')
                qtype = q.get('type', 'text')
                
                if qtype == 'radio':
                    # For radios, answer with the question text so we can match
                    ans = get_answer_from_hermes(q.get('q', label), profile)
                else:
                    ans = get_answer_from_hermes(label, profile)
                
                if ans:
                    answers[label] = ans
            
            with open(ANSWER_FILE, 'w') as f:
                json.dump({'answers': answers, 'timestamp': int(time.time())}, f, indent=2)
            
            print(f"Wrote {len(answers)} answers")
            
        except Exception as e:
            print(f"Error: {e}")
        
        time.sleep(2)

if __name__ == '__main__':
    main()
