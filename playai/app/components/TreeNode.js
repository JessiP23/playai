export class TreeNodePdf {
    constructor(data, start, end) {
        this.data = data;
        this.start = start; 
        this.end = end;
        this.left = null;
        this.right = null;
        this.height = 1;
    }
}

class PdfAVLTree {
    constructor() {
        this.root = null;
    }

    height(node) {
        return node ? node.height : 0;
    }

    balanceFactor(node) {
        return this.height(node.left) - this.height(node.right);
    }

    rotateRight(y) {
        const x = y.left;
        const T2 = x.right;

        x.right = y;
        y.left = T2;

        y.height = Math.max(this.height(y.left), this.height(y.right)) + 1;
        x.height = Math.max(this.height(x.left), this.height(x.right)) + 1;

        return x;
    }

    rotateLeft(x) {
        const y = x.right;
        const T2 = y.left;

        y.left = x;
        x.right = T2;

        x.height = Math.max(this.height(x.left), this.height(x.right)) + 1;
        y.height = Math.max(this.height(y.left), this.height(y.right)) + 1;

        return y;
    }

    insert(node, data, start, end) {
        if (!node) return new TreeNodePdf(data, start, end);

        if (start < node.start) {
            node.left = this.insert(node.left, data, start, end);
        } else if (start > node.start) {
            node.right = this.insert(node.right, data, start, end);
        } else {
            return node;
        }

        node.height = Math.max(this.height(node.left), this.height(node.right)) + 1

        const balance = this.balanceFactor(node);

        if (balance > 1 && start < node.left.start) {
            return this.rotateRight(node);
        }

        // right case
        if (balance < -1 && start > node.right.start) {
            return this.rotateLeft(node);
        }

        // left right case
        if (balance > 1 && start > node.left.start) {
            node.left = this.rotateLeft(node.left);
            return this.rotateRight(node);
        }

        // right left case
        if (balance < -1 && start < node.right.start) {
            node.right = this.rotateRight(node.right);
            return this.rotateLeft(node);
        }
        return node;
    }

    search(node, pageNum) {
        if (!node) return null;
        if (pageNum >= node.start && pageNum <= node.end) return node;
        if (pageNum < node.start) return this.search(node.left, pageNum);
        return this.search(node.right, pageNum);
    }
}

export default PdfAVLTree;