const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { callAI } = require('./ai');
const { parseFile } = require('./fileParser');

const app = express();
const upload = multer({ dest: 'uploads/' });

// 1. 启用完整 CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- 路由 1: 简历优化 ---
app.post('/api/resume', upload.single('file'), async (req, res) => {
    try {
        let content = req.body.content || '';
        const { direction, jobHint } = req.body;

        // 如果有上传文件，先解析文件
        if (req.file) {
            content = await parseFile(req.file);
        }

        if (!content || content === 'ping') {
            return res.json({ code: 200, data: { msg: "pong" }, msg: "success" });
        }

        const prompt = `你是一位专业的简历优化专家。请根据以下简历内容进行优化。
优化方向：${direction || '平衡'}
岗位关键词：${jobHint || '未指定'}

要求：
1. 保持内容真实性，但表述更专业、更具吸引力。
2. 重点突出与岗位相关的技能和成就。
3. 如果方向是“更量化”，请尝试挖掘数据支持；如果方向是“更简洁”，请精简冗余表述。
4. 直接返回优化后的简历正文，不需要任何开头或结尾的废话。

原始简历：
${content}`;

        const aiRes = await callAI('zhipu', [{ role: 'user', content: prompt }]);
        const optimized = aiRes.data.choices[0].message.content;

        res.json({
            code: 200,
            data: { optimized },
            msg: "success"
        });
    } catch (error) {
        console.error('简历优化失败:', error);
        res.status(500).json({ code: 500, msg: error.message });
    }
});

// --- 路由 2: 写作助手 + PPT 大纲 ---
app.post('/api/write', upload.single('file'), async (req, res) => {
    try {
        let content = req.body.content || '';
        const { type, mode, topic, detail } = req.body;

        if (req.file) {
            content = await parseFile(req.file);
        }

        let prompt = "";
        if (type === 'ppt') {
            prompt = `你是一位专业的 PPT 策划专家。请根据以下主题和说明，生成一个结构清晰、逻辑严密的 PPT 大纲。
主题：${topic || '未命名'}
补充说明：${detail || '无'}
参考素材内容：${content || '无'}

要求：
1. 以 JSON 格式返回结果。
2. 结构为：{"slides": [{"title": "页面标题", "bullets": ["要点1", "要点2"]}]}
3. 必须只返回 JSON，不要有任何 Markdown 代码块标签或其他解释性文字。`;
        } else {
            prompt = `你是一位优秀的文字编辑。请对以下文本进行${mode || '润色'}。
文本内容：${content}

要求：
1. 保持原意，但提升文采、逻辑性和可读性。
2. 根据模式要求调整语气（如正式、口语化等）。
3. 直接返回润色后的正文，不要有任何废话。`;
        }

        const aiRes = await callAI('zhipu', [{ role: 'user', content: prompt }]);
        const aiResult = aiRes.data.choices[0].message.content;

        if (type === 'ppt') {
            try {
                // 尝试清理可能出现的 Markdown 标签
                const cleanJson = aiResult.replace(/```json|```/g, '').trim();
                const data = JSON.parse(cleanJson);
                res.json({ code: 200, data, msg: "success" });
            } catch (e) {
                console.error('PPT JSON 解析失败:', aiResult);
                res.status(500).json({ code: 500, msg: "AI 返回格式错误，请重试" });
            }
        } else {
            res.json({
                code: 200,
                data: { content: aiResult },
                msg: "success"
            });
        }
    } catch (error) {
        console.error('写作助手失败:', error);
        res.status(500).json({ code: 500, msg: error.message });
    }
});

// --- 路由 3: 情绪日记分析 ---
app.post('/api/mood', async (req, res) => {
    try {
        const content = req.body.content || '';
        if (!content) return res.status(400).json({ code: 400, msg: "内容不能为空" });

        const prompt = `你是一位温柔耐心的心理咨询师。请阅读以下日记，分析作者的情绪，并给出简短而温馨的建议。
日记内容：${content}

要求：
1. 以 JSON 格式返回结果。
2. 结构为：{"emotion": "识别出的核心情绪关键词", "intensity": 1-5的数值, "suggestion": "你的建议"}
3. 必须只返回 JSON，不要有任何 Markdown 代码块标签或其他解释性文字。`;

        const aiRes = await callAI('zhipu', [{ role: 'user', content: prompt }]);
        const aiResult = aiRes.data.choices[0].message.content;

        try {
            const cleanJson = aiResult.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanJson);
            res.json({ code: 200, data, msg: "success" });
        } catch (e) {
            res.status(500).json({ code: 500, msg: "AI 分析格式错误" });
        }
    } catch (error) {
        console.error('情绪日记分析失败:', error);
        res.status(500).json({ code: 500, msg: error.message });
    }
});

// --- 路由 4: 文件提取 ---
app.post('/api/upload/extract', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ code: 400, msg: "未上传文件" });
        const text = await parseFile(req.file);
        res.json({ code: 200, data: { text }, msg: "success" });
    } catch (error) {
        res.status(500).json({ code: 500, msg: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`序章 AI 后端服务已启动！`);
    console.log(`API 地址: http://localhost:${PORT}`);
    console.log(`已成功连接智谱 AI / 讯飞星火接口`);
    console.log(`请确保 .env 文件中已配置有效的 API Key`);
    console.log(`-----------------------------------------`);
});