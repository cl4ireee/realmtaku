require('dotenv').config()
const express = require('express');
const axios = require('axios');
const router = express.Router();

const headers = {
  accept: 'application/json',
  'X-API-Key': process.env.APIKEY
};

// Recomend Comic
async function RecommendationsComic() {
  try {
    const otakudesuUrl = 'https://apiomni.maelyn.tech/api/komikcast/lastupdate';
    const response = await axios.get(otakudesuUrl, { headers });
    
    if (response.status !== 200) {
      throw new Error('Failed to fetch data');
    }
    const ongoingAnime = response.data.result;
    const getRandomItems = (arr, count) => {
      const shuffled = arr.slice(0);
      let i = arr.length;
      let min = i - count;
      let temp;
      let index;

      while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
      }

      return shuffled.slice(min);
    };

    const randomRecommendations = getRandomItems(ongoingAnime, 4);

    return randomRecommendations;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}

function getRandomItems(arr, numItems) {
  const shuffled = arr.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numItems);
}

async function random() {
  try {
    const komikcastUrl = 'https://apiomni.maelyn.tech/api/komikcast/hot';

    // Fetch data from both APIs concurrently
    const [komikcastResponse] = await Promise.all([
      axios.get(komikcastUrl, { headers }),
    ]);

    const hotComics = komikcastResponse.data.result;

    const formattedHotComics = hotComics.map(comic => ({
      ...comic,
      type: 'Comic',
      episodeTerbaru: comic.chapter.replace(/^Ch\./, '').trim(),
      slug: comic.slug,
      poster: comic.poster,
    }));

    const combinedData = formattedHotComics

    const randomItems = getRandomItems(combinedData, 13);

    return randomItems;
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}

router.get('/', async (req, res) => {
  let comicData = [];
  let randoms = [];

  try {
    const comic = await axios.get('https://apiomni.maelyn.tech/api/komikcast/lastupdate', { headers });
    comicData = comic.data.result.map(item => ({ ...item, item_type: 'Comic' }));
  } catch (error) {
    console.error('Error fetching comic data:', error.message);
    comicData = [];
  }

  try {
    randoms = await random();
  } catch (error) {
    console.error('Error fetching random data:', error.message);
    randoms = [];
  }

  res.render('index', { comicData, randoms, showDisqus: false });
});


router.get('/search', async (req, res) => {
  const query = req.query.q; // Mengambil query dari parameter

  if (!query) {
    return res.status(400).send('Query parameter is required');
  }

  try {
    // Fetching from Komikcast API
    const comicResponse = await axios.get(`https://apiomni.maelyn.tech/api/komikcast/search?q=${query}`, { headers }).catch(err => err.response);

    const comicData = comicResponse.data;

    let searchResults = [];

    // Process results from Komikcast API
    if (comicData.status) {
      searchResults = searchResults.concat(comicData.result.map(item => ({
        ...item,
        type: 'comic',
        item_type: 'Comic',
        status: item.chapter || '',
        slug: item.slug || '',
      })));
    }

    // Render results or show message if none found
    if (searchResults.length > 0) {
      res.render('search', { searchResults, query, errorMessage: '' });
    } else {
      res.render('search', { searchResults: [], query, errorMessage: 'Tidak ada data ditemukan' });
    }
  } catch (error) {
    console.error('Error fetching search results:', error);
    res.render('search', { searchResults: [], query, errorMessage: 'Terjadi kesalahan dalam pencarian' });
  }
});

router.get('/genres', async (req, res) => {
  const slug = req.query.slug; // Menangkap slug dari query parameter
  const page = parseInt(req.query.page) || 1;

  try {
    // Mendapatkan daftar genre dari Komikcast
    const comicGenre = await axios.get('https://apiomni.maelyn.tech/api/komikcast/genres', { headers });
    const genreComic = comicGenre.data.result || [];

    let comicList = [];
    let paginationComic = {};
    let maxPagination = 1;

    if (slug) {
      try {
        // Mendapatkan comic berdasarkan genre dari Komikcast
        const comicResponse = await axios.get(`https://apiomni.maelyn.tech/api/komikcast/genres/detail?slug=${slug}&page=${page}`, { headers });
        const { items: comicItems, paginationMax } = (await comicResponse.data).result || {};
        comicList = comicItems.map(item => ({ ...item, item_type: 'Comic' })) || [];

        // Mengupdate maksimum pagination
        if (paginationMax) {
          maxPagination = paginationMax;
        }
      } catch (error) {
        console.error('Error fetching comic data:', error);
        comicList = []; // Set comicList to empty if there's an error
      }
    }

    res.render('genres', {
      genreComic,
      comicList,
      genre: slug,
      paginationComic,
      maxPagination,
      ep_slug: slug,
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.render('genres', {
      genreComic: [],
      comicList: [],
      genre: slug,
      paginationComic: {},
      maxPagination: 1,
      currentPage: 1,
      ep_slug: slug,
      errorMessage: 'Failed to fetch data'
    });
  }
});


router.get('/bookmarks', (req, res) => {
  const bookmarks = req.cookies.bookmarks ? JSON.parse(req.cookies.bookmarks) : [];
  res.render('bookmarks', { bookmarks });
});

// COMIC
router.get('/comic/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const response = await axios.get(`https://apiomni.maelyn.tech/api/komikcast/detail?slug=${slug}`, { headers });
    const comicDetail = response.data.result;

    const recomend = await RecommendationsComic()

    res.render('comic-detail', { comicDetail, recomend, ep_slug: slug, item_type: 'Comic', showDisqus: true });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

router.get('/comic/chapter/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const response = await axios.get(`https://apiomni.maelyn.tech/api/komikcast/chapter?slug=${slug}`, { headers });
    const comicChapter = response.data.result;

    const recomend = await RecommendationsComic()

    res.render('comic-chapter', { comicChapter, recomend, ep_slug: slug, showDisqus: true });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

router.get('/list-comic', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1; // default to page 1 if no page query parameter is provided

  try {
    const response = await axios.get(`https://apiomni.maelyn.tech/api/komikcast/list?page=${page}`, { headers });
    const data = response.data;

    if (data.status) {
      const maxPages = Math.ceil(data.result.paginationMax / 10); // assuming 10 items per page
      res.render('comic-list', {
        comics: data.result.results,
        currentPage: page,
        maxPages: maxPages
      });
    } else {
      res.render('comic-list', { comics: [], currentPage: 1, maxPages: 1 });
    }
  } catch (error) {
    console.error('Error fetching comic data:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
