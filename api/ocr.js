/**
 * PUB AI v7.0 Elite - Google Cloud Vision Serverless Proxy
 * Securely handles OCR requests to prevent API key exposure.
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { image } = req.body; // Base64 encoded image
    const apiKey = process.env.GOOGLE_VISION_API_KEY?.trim();

    if (!apiKey) {
        return res.status(500).json({ 
            error: 'Google API Key Missing', 
            details: 'Vercel 환경 변수에 GOOGLE_VISION_API_KEY를 설정해 주세요.' 
        });
    }

    if (!image) {
        return res.status(400).json({ error: 'No image data provided' });
    }

    // Clean base64 string if it contains prefix
    const base64Image = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    try {
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    image: { content: base64Image },
                    features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
                }]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'Google Vision API Error');
        }

        // Return the structured text annotation
        const result = data.responses[0];
        res.status(200).json({
            fullText: result.fullTextAnnotation?.text || '',
            blocks: result.fullTextAnnotation?.pages[0]?.blocks || [],
            success: true
        });

    } catch (error) {
        console.error('OCR Backend Error:', error);
        res.status(500).json({ error: 'AI 분석 실패', details: error.message });
    }
}
