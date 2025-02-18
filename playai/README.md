# PDF Reader Pro

A modern web application that converts PDF documents to speech using Play.ai's text-to-speech API. Features include page-by-page navigation, voice selection, and optimized audio chunk processing.

## Key Features

- PDF upload and viewing with page navigation
- Text-to-speech conversion with multiple voice options  
- Optimized PDF compression and caching
- Chunk-based audio processing for better performance
- Modern, responsive UI design

## Technologies Used

### Frontend
- **Next.js 13+** - React framework for building the UI
- **Tailwind CSS** - Utility-first CSS framework for styling
- **react-pdf** - PDF rendering library
- **react-dropzone** - File upload handling

### Backend
- **Express.js** - Node.js web application framework
- **node-cache** - Caching for audio chunks
- **pdf-lib** - PDF manipulation
- **pako** - Compression algorithm for PDF data
- **Play.ai API** - Text-to-speech service

## Design Decisions

- **AVL Tree Structure**: Used for efficient PDF page storage and retrieval with O(log n) complexity
- **Chunk-based Processing**: Text split into 25-word chunks for smoother audio playback
- **Caching System**: Implemented audio caching to reduce API calls and improve performance
- **Compression**: PDF compression to optimize storage and loading times
- **Component Architecture**: Modular design for better maintainability and code reuse

## Technical challenges
To manage large PDFs documents in a text-to-speech presents performance and scalability challenges:
1. **Performance Degradation**
    - Slow page-to-page navigation
    - Linear search time in large documents
    - High memory consumption

2. **Business impact**
    - Increased costs
    - Poor user experience

## Solution: AVL Tree Implementation

### Why AVL Tree?
We evaluated multiple data structures before choosing AVL:

| Structure | Time Complexity | Memory Usage | Navigation | Key Limitation |
|-----------|----------------|--------------|------------|----------------|
| Array | O(n) | O(n) | Sequential | Linear search time |
| Hash Table | O(1) | O(n) | Random | No ordered access |
| Red-Black Tree | O(log n) | O(n) | Ordered | Less balanced |
| **AVL Tree** | **O(log n)** | **O(n)** | **Ordered** | None* |

*AVL's stricter balancing guarantees optimal performance for our use case.


### business problem
To manage large PDFs in a text-to-speech shows various challenges:
1. Slow access in large documents (e.g 1000 pages)
2. High memory utilization
3. Slow navigation between pages
4. The performance between random page access is poor and slow

### Step-by-step process
#### 1. When a PDF is uploaded
```javascript
const processedPdf = await PdfCompress.compressPdf(file)
// File is compressed, the PDF pages are extracted, and the AVL tree is constructed
```

#### 2. Tree construction with 10-page PDF
```javascript
/// Choose middle page as root (Page 5)
/**
 *                  5 
 *              /       \
 *            1-4      6-10
 * 
 * 
 * Divide left and right nodes
 *                 5
 *              /     \
 *             3       8
 *           /  \    /  \
 *          1   4   6    9
 * 
 * The goal is to find a balanced structure
 *                  5
 *                /   \ 
 *              3      8
 *            /  \   /   \
 *           2   4  6     9
 *          /            /  \
 *         1            7   10
 * 
 * 
*/
```

#### 3. Balancing process
```javascript
/**
 *
 * 
 * Case 1: Left-Left Imbalance
 *     
 *    Left side             After balancing
 *      3                         (root middle)
 *     /                          2
 *    2         ---->           /   \
 *   /                         1     3
 *  1 
 * 
 * 
 * Case 2: Right-right Imbalance
 * 
 * Right side               Balancing
 *                            (root middle)
 *      1                           
 *        \                         2
 *          2        ---->        /   \
 *            \                  1    3
 *              3
 * 
*/
```


#### 4. Navigation between pages (1 to 9)
```javascript

/**
 * 
 * 
 * // Example, assume we want to jump from page 1 to 9
 * 
 * search (root, 9) {
 *      we start at the middle of the page (5)
 *      9 > 5, so we move to the right
 *      we find 9 in the second right subtree
 *      Time complexity is O(log n)
 * }
 * 
 * /
```

### Memory management
#### 1. Compression
```javascript
static async compressPdfFile(filePdf) {
    // first step, we need to load the PDF
    const arrayBuffer = await file.arrayBuffer();

    // compress pages
    const compressLoadedPdf = await this.compressBatch(pdfBytes);

    // store compressed pdf in tree avl
    tree.inset(compressedLoadedPdf, pageNumber);
}

```

#### 2. Caching
Caching is not that relevant, but can help to leverage concurrent data from the user (most visited pages)
```javascript
const cacheKey = `page-${pageNumber}`;

if (pageCache.has(cacheKey)) {
    return pageCache.get(cacheKey);
}

```

I can possible add an LRU cache, which suggests when the cache memory is full, LRU picks the data that is least recently used and removes it in order to make space for the new data.

#### 3. Complexity Metrics
To find a corresponding page, those are some of the metrics to find that page:
To load 10 pages, by using TreeNode would take up to 4 steps max
To load 100 pages, will take 6-7 steps max
To load 1000 pages, will take 9-10 steps max

The time complexity is this:
Insert -> O(log n)
Search -> O(log n)
Delete -> O(log n)
Space -> O(n)


### Tree AVL vs Array Vs Hash Table vs Red-Black Tree
Array takes O(n) access time (needs to iterate each page to find the desired one), meanwhile AVL Tree is O(log n)
Hash Table does not have ordered access, with AVL Tree we handle better memory utilization.
Red-Black Tree is not strictly balanced, which produces slower reads



## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/JessiP23/playai.git
cd playai
```
2. Install dependencies:
```bash
npm install 
```

3. Set up environment variables: Create a .env file in the root directory:
```bash
PLAYAI_API_KEY=your_api_key
PLAYAI_USER_ID=your_user_id
PORT=3001
```

4. Start the development servers:
Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Backend):
```bash
cd backend
npm install
node server.js
```

5. Open http://localhost:3000 in your browser
