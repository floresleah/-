const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const fs = require('fs');

async function parseFile(file) {
    const extension = file.originalname.split('.').pop().toLowerCase();
    
    try {
        if (extension === 'docx') {
            const result = await mammoth.extractRawText({ path: file.path });
            return result.value;
        } else if (extension === 'pdf') {
            const dataBuffer = fs.readFileSync(file.path);
            const data = await pdf(dataBuffer);
            return data.text;
        } else if (extension === 'txt') {
            return fs.readFileSync(file.path, 'utf-8');
        } else {
            throw new Error('不支持的文件格式');
        }
    } catch (error) {
        console.error('文件解析失败:', error);
        throw new Error(`文件解析失败: ${error.message}`);
    } finally {
        // 解析完后删除临时文件
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    }
}

module.exports = { parseFile };