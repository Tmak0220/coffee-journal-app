import axios from 'axios';
import * as fs from 'fs';

const WP_API_URL = 'https://real-coffee.net/wp-json/wp/v2/posts';

async function fetchPosts() {
  try {
    console.log('WordPressからデータを取得中...');
    const response = await axios.get(WP_API_URL, {
      params: { per_page: 100 } // 一度に取得する件数
    });
    
    // 取得したデータをJSONファイルに保存
    fs.writeFileSync('posts.json', JSON.stringify(response.data, null, 2));
    console.log('成功！ posts.json にデータを保存しました。');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

fetchPosts();