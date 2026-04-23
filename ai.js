const axios = require('axios');
require('dotenv').config();

const ZHIPU_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const SPARK_URL = 'https://spark-api-open.xfyun.cn/v1/chat/completions'; // 星火 OpenAI 兼容接口地址

/**
 * 通用 AI 调用函数
 * @param {string} type - 'zhipu' 或 'spark'
 * @param {Array} messages - 消息列表
 * @param {boolean} stream - 是否流式
 */
async function callAI(type, messages, stream = false) {
    const config = {
        zhipu: {
            url: ZHIPU_URL,
            key: process.env.ZHIPU_API_KEY,
            model: 'glm-4-flash'
        },
        spark: {
            url: SPARK_URL,
            key: process.env.SPARK_API_KEY,
            model: 'spark-v4.0'
        }
    }[type];

    if (!config || !config.key) {
        throw new Error(`未配置 ${type} 的 API Key`);
    }

    try {
        const response = await axios({
            method: 'post',
            url: config.url,
            headers: {
                'Authorization': `Bearer ${config.key}`,
                'Content-Type': 'application/json'
            },
            data: {
                model: config.model,
                messages,
                stream,
                temperature: 0.7
            },
            responseType: stream ? 'stream' : 'json'
        });

        return response; // 返回整个 response 对象以便处理 stream
    } catch (error) {
        console.error(`${type} API 调用失败:`, error.response?.data || error.message);
        throw new Error(`AI 服务暂时不可用: ${error.message}`);
    }
}

module.exports = { callAI };