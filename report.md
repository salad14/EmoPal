1.	Brief Description of the Program
1.1 Overall Overview
EmoPal is an AI-powered web application that serves as a comprehensive virtual emotional companion. More than a simple chatbot, it is a multi-modal interaction platform that enables users to engage in rich, emotionally aware conversations through both text and speech. Designed with the goal of enhancing emotional well-being, EmoPal specifically caters to users who may feel lonely, stressed, or emotionally overwhelmed, offering them real-time empathetic responses and companionship that feels personal and sincere.
What makes EmoPal particularly innovative is its integration of several advanced technologies into a cohesive emotional AI experience. By combining real-time sentiment analysis, voice recognition, text-to-speech synthesis, and an animated 3D avatar, EmoPal offers a user experience that closely mimics natural human interaction. It is not merely reactive; it is contextually adaptive, dynamically shaping its responses based on both the semantic content and emotional tone of user inputs.
For instance, when a user expresses sadness, EmoPal identifies the emotional undertone using Baidu NLP APIs and responds with an encouraging, supportive message generated through the DeepSeek API. At the same time, the 3D virtual avatar mirrors these interactions visually—perhaps displaying a soft expression or slower body movements to match the mood—thus reinforcing the empathetic nature of the conversation. The inclusion of speech synthesis allows the bot to "speak" in a natural tone, which can further reduce emotional distance and foster a more humanized interaction.
EmoPal’s ability to operate in both text and voice modes simultaneously opens the door to broader accessibility. People with visual impairments, reading difficulties, or even just a preference for voice interaction can benefit from its features. Furthermore, the modular nature of its design means that new capabilities—such as multilingual support, facial emotion recognition, or personalized long-term emotional profiling—can be added without disrupting the existing system.
In essence, EmoPal represents a forward-looking application of emotional computing. It blends artificial intelligence, affective computing, and user-centric design to create a system that is not just smart, but emotionally intelligent. It is a companion that listens, understands, and responds in ways that feel genuinely considerate.
1.2 Key Technologies Used:
Frontend Framework: Built using React and TypeScript, which offers component-based UI development and strict typing for more reliable and scalable code.
Build Tool: Vite is used for its lightning-fast development server and optimized builds.
Speech Processing: The Web Speech API provides both voice input (speech recognition) and voice output (speech synthesis).
3D Interaction: Three.js is used to render and animate a virtual character that reacts to the emotional tone of conversations.
NLP and AI Integration: Baidu NLP API is used for emotion and sentiment analysis. DeepSeek API generates personalized, empathetic responses.
Serverless Backend: A set of Node.js-based APIs run in a serverless environment, handling emotion analysis, chat processing, and auxiliary services like weather fetching.
1.3 Codebase Structure and Modules:
Root Entry (main.tsx): The application bootstraps from main.tsx, where ReactDOM renders the main <App /> component within the root DOM node.
App Shell (App.tsx): This is the top-level component that imports and renders the three key submodules:VirtualAgent (3D interactive character), ChatInterface (chat UI with input/output), MoodDiary (emotion tracking interface).
Component Modules (components/):
1)ChatInterface: Includes JSX and TypeScript logic for real-time chat interaction. This component is responsible for managing user messages, invoking backend APIs, and displaying chat history. It also integrates speech recognition and synthesis via custom hooks.
2)VirtualAgent: Implements a 3D canvas using Three.js where a virtual avatar reflects user emotions. For example, the avatar may show concern if the user is sad.
3)MoodDiary: Provides a form or interface where users can record their mood over time, serving as an emotion journal.
Hooks (hooks/):
1)useWebSpeechRecognition: Manages speech-to-text conversion using the browser’s Web Speech API. It returns status flags and recognized text.
2)useWebSpeechSynthesis: Handles text-to-speech conversion, allowing the AI to respond with a voice.
Service Layer (services/apiClient.ts): This module abstracts the HTTP calls made to the backend APIs. It simplifies front-end logic and ensures that API interactions remain decoupled from UI code.
Backend API (api/): The serverless backend includes:
1)analyze-emotion.js: Calls Baidu NLP APIs to detect sentiment and dialogue emotion.
2)analyze-and-chat.js: Orchestrates both emotion analysis and AI response generation using DeepSeek.
3)get-weather.js: Fetches current weather conditions, possibly used to make replies more human and relevant.
4)_middleware.js: Handles request pre-processing, such as setting headers or validating input formats.
Type Definitions (types/): Custom TypeScript declaration files for modules like Three.js, ensuring proper typing during development.
Assets and Styles: The project also includes .svg logos, .css files for styling individual components, and configuration files like vite-env.d.ts for managing environment settings.
2.Implemented Requirements
EmoPal successfully meets a wide range of requirements necessary for an emotionally responsive, intelligent virtual companion:
Natural Language Understanding: Through the Baidu NLP API, the program can detect whether user input is emotionally positive, neutral, or negative. It can further classify specific emotions such as sadness, anxiety, or happiness.
Empathetic Conversation: The DeepSeek API is used to craft context-aware and emotionally aligned responses. For instance, if the emotion analysis reveals user sadness, the AI will generate replies that are supportive and comforting.
Speech Interaction: Users can speak directly to EmoPal, with their speech recognized in real-time and converted to text using the Web Speech API. Conversely, the AI can vocalize its replies using speech synthesis, creating a natural dialogue flow.
3D Virtual Agent: A central visual feature, the Three.js-based avatar provides animated feedback based on user emotion or AI sentiment, thereby enhancing immersion and user engagement.
Emotion Logging: Users can optionally track their emotional state over time via the MoodDiary component. This could support future features like emotion history visualization.
Modular Architecture: The entire application is designed in a modular fashion, where UI, logic, and API layers are decoupled. This improves maintainability and scalability.
Environment Management: All sensitive credentials like API keys are managed through environment variables (via .env.local), ensuring secure deployment practices.
Responsive UI: Styling is applied through modular CSS, and the application is compatible with modern browsers, supporting both desktop and mobile experiences.
