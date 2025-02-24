class NodeLinkEditor {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.links = [];
        this.selectedNode = null;
        this.selectedLink = null;
        this.draggedNode = null;
        this.linkSource = null;
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.lastMousePos = { x: 0, y: 0 };
        this.isPanning = false;
        this.newNodePos = null;
        this.isCreatingLink = false;

        this.setupCanvas();
        this.loadFromLocalStorage();
        this.setupEventListeners();
    }

    setupCanvas() {
        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight - 50; // Account for toolbar
            this.draw();
        };
        window.addEventListener('resize', resize);
        resize();
    }

    setupEventListeners() {
        // Canvas events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

        // Modal events
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                closeBtn.closest('.modal').style.display = 'none';
                this.selectedNode = null;
                this.selectedLink = null;
                this.linkSource = null;
                this.newNodePos = null;
            });
        });

        // Form submissions
        const nodeForm = document.getElementById('nodeForm');
        nodeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const label = document.getElementById('nodeLabel').value.trim();
            const remarks = document.getElementById('nodeRemarks').value.trim();

            if (!label) return; // Don't proceed if label is empty

            if (this.selectedNode) {
                // Edit existing node
                this.selectedNode.label = label;
                this.selectedNode.remarks = remarks;
            } else if (this.newNodePos) {
                // Create new node
                const newNode = {
                    id: Date.now(),
                    label,
                    remarks,
                    x: this.newNodePos.x,
                    y: this.newNodePos.y
                };
                this.nodes.push(newNode);
                this.newNodePos = null;
            }

            document.getElementById('nodeModal').style.display = 'none';
            nodeForm.reset();
            this.selectedNode = null;
            this.saveToLocalStorage();
            this.draw();
        });

        const linkForm = document.getElementById('linkForm');
        linkForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const label = document.getElementById('linkLabel').value.trim();
            const remarks = document.getElementById('linkRemarks').value.trim();

            if (this.selectedLink) {
                // Edit existing link
                this.selectedLink.label = label;
                this.selectedLink.remarks = remarks;
            } else if (this.linkSource && this.selectedNode) {
                // Create new link
                const newLink = {
                    id: Date.now(),
                    source_id: this.linkSource.id,
                    target_id: this.selectedNode.id,
                    label,
                    remarks
                };
                this.links.push(newLink);
                this.linkSource = null;
                this.selectedNode = null;
                this.isCreatingLink = false;
                document.getElementById('createLinkButton').classList.remove('active');
                this.showStatus('');
            }

            document.getElementById('linkModal').style.display = 'none';
            linkForm.reset();
            this.selectedLink = null;
            this.saveToLocalStorage();
            this.draw();
        });

        // Context menu
        document.getElementById('editButton').addEventListener('click', this.handleEdit.bind(this));
        document.getElementById('deleteButton').addEventListener('click', this.handleDelete.bind(this));

        // Toolbar events
        document.getElementById('saveButton').addEventListener('click', this.saveToFile.bind(this));
        document.getElementById('loadButton').addEventListener('click', this.loadFromFile.bind(this));
        document.getElementById('createLinkButton').addEventListener('click', () => {
            this.isCreatingLink = !this.isCreatingLink;
            document.getElementById('createLinkButton').classList.toggle('active');
            if (this.isCreatingLink) {
                this.showStatus('Select source node');
            } else {
                this.showStatus('');
                this.linkSource = null;
                this.selectedNode = null;
            }
            this.draw();
        });
        document.getElementById('nodeShape').addEventListener('change', () => this.draw());
        document.getElementById('linkStyle').addEventListener('change', () => this.draw());
        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(1.1));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(0.9));
        document.getElementById('resetZoom').addEventListener('click', () => {
            this.scale = 1;
            this.offset = { x: 0, y: 0 };
            this.draw();
        });

        // Hide context menu on click outside
        document.addEventListener('click', (e) => {
            const contextMenu = document.getElementById('contextMenu');
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        });
    }

    showStatus(message) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.classList.toggle('visible', message !== '');
    }

    // Coordinate transformations
    toScreenCoords(x, y) {
        return {
            x: (x + this.offset.x) * this.scale,
            y: (y + this.offset.y) * this.scale
        };
    }

    toWorldCoords(x, y) {
        return {
            x: x / this.scale - this.offset.x,
            y: y / this.scale - this.offset.y
        };
    }

    // Drawing functions
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw links
        this.links.forEach(link => this.drawLink(link));
        
        // Draw nodes
        this.nodes.forEach(node => this.drawNode(node));

        // Draw link preview if creating a link
        if (this.linkSource && this.lastMousePos) {
            const sourcePos = this.toScreenCoords(this.linkSource.x, this.linkSource.y);
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.moveTo(sourcePos.x, sourcePos.y);
            this.ctx.lineTo(this.lastMousePos.x, this.lastMousePos.y);
            this.ctx.strokeStyle = '#999';
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    drawNode(node) {
        const { x, y } = this.toScreenCoords(node.x, node.y);
        const nodeShape = document.getElementById('nodeShape').value;
        const size = 60 * this.scale;

        this.ctx.save();
        this.ctx.fillStyle = node === this.selectedNode || node === this.linkSource ? '#e0e0ff' : '#ffffff';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;

        switch (nodeShape) {
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                break;
            case 'triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - size / 2);
                this.ctx.lineTo(x + size / 2, y + size / 2);
                this.ctx.lineTo(x - size / 2, y + size / 2);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
            default: // rectangle
                this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
                this.ctx.strokeRect(x - size / 2, y - size / 2, size, size);
        }

        // Draw label
        this.ctx.fillStyle = '#000000';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = `${12 * this.scale}px Arial`;
        this.ctx.fillText(node.label, x, y);

        this.ctx.restore();
    }

    drawLink(link) {
        const source = this.nodes.find(n => n.id === link.source_id);
        const target = this.nodes.find(n => n.id === link.target_id);
        if (!source || !target) return;

        const sourcePos = this.toScreenCoords(source.x, source.y);
        const targetPos = this.toScreenCoords(target.x, target.y);
        const linkStyle = document.getElementById('linkStyle').value;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(sourcePos.x, sourcePos.y);
        this.ctx.lineTo(targetPos.x, targetPos.y);

        this.ctx.strokeStyle = link === this.selectedLink ? '#0000ff' : '#000000';
        this.ctx.lineWidth = 2;

        switch (linkStyle) {
            case 'dashed':
                this.ctx.setLineDash([5, 5]);
                break;
            case 'dotted':
                this.ctx.setLineDash([2, 2]);
                break;
        }

        this.ctx.stroke();

        // Draw label if exists
        if (link.label) {
            const midX = (sourcePos.x + targetPos.x) / 2;
            const midY = (sourcePos.y + targetPos.y) / 2;
            this.ctx.fillStyle = '#000000';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.font = `${12 * this.scale}px Arial`;
            this.ctx.fillText(link.label, midX, midY);
        }

        this.ctx.restore();
    }

    // Event handlers
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldPos = this.toWorldCoords(mouseX, mouseY);

        if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle button or Alt+Left click
            this.isPanning = true;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            return;
        }

        // Check if clicked on a node
        const clickedNode = this.nodes.find(node => {
            const nodePos = this.toScreenCoords(node.x, node.y);
            const dx = nodePos.x - mouseX;
            const dy = nodePos.y - mouseY;
            return Math.sqrt(dx * dx + dy * dy) < 30 * this.scale;
        });

        if (clickedNode) {
            if (e.button === 0) { // Left click
                if (this.isCreatingLink) {
                    if (!this.linkSource) {
                        this.linkSource = clickedNode;
                        this.showStatus('Select target node');
                    } else if (this.linkSource !== clickedNode) {
                        this.selectedNode = clickedNode;
                        document.getElementById('linkModal').style.display = 'block';
                    }
                } else {
                    this.draggedNode = clickedNode;
                }
            } else if (e.button === 2) { // Right click
                this.selectedNode = clickedNode;
                this.showContextMenu(e.clientX, e.clientY);
            }
        } else {
            // Check if clicked on a link
            this.selectedLink = this.links.find(link => {
                const source = this.nodes.find(n => n.id === link.source_id);
                const target = this.nodes.find(n => n.id === link.target_id);
                if (!source || !target) return false;

                const sourcePos = this.toScreenCoords(source.x, source.y);
                const targetPos = this.toScreenCoords(target.x, target.y);
                return this.isPointNearLine(mouseX, mouseY, sourcePos, targetPos);
            });

            if (this.selectedLink && e.button === 2) {
                this.showContextMenu(e.clientX, e.clientY);
            } else if (!this.selectedLink && e.button === 0 && !this.isCreatingLink) {
                // Create new node
                this.newNodePos = worldPos;
                document.getElementById('nodeModal').style.display = 'block';
            }
        }

        this.draw();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (this.isPanning) {
            const dx = e.clientX - this.lastMousePos.x;
            const dy = e.clientY - this.lastMousePos.y;
            this.offset.x += dx / this.scale;
            this.offset.y += dy / this.scale;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.draw();
            return;
        }

        if (this.draggedNode) {
            const worldPos = this.toWorldCoords(mouseX, mouseY);
            this.draggedNode.x = worldPos.x;
            this.draggedNode.y = worldPos.y;
            this.draw();
        }

        if (this.linkSource) {
            this.lastMousePos = { x: mouseX, y: mouseY };
            this.draw();
        }

        // Update tooltip
        const tooltip = document.getElementById('tooltip');
        const hoveredNode = this.nodes.find(node => {
            const nodePos = this.toScreenCoords(node.x, node.y);
            const dx = nodePos.x - mouseX;
            const dy = nodePos.y - mouseY;
            return Math.sqrt(dx * dx + dy * dy) < 30 * this.scale;
        });

        if (hoveredNode && hoveredNode.remarks) {
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.clientX + 10}px`;
            tooltip.style.top = `${e.clientY + 10}px`;
            tooltip.textContent = hoveredNode.remarks;
        } else {
            const hoveredLink = this.links.find(link => {
                const source = this.nodes.find(n => n.id === link.source_id);
                const target = this.nodes.find(n => n.id === link.target_id);
                if (!source || !target) return false;

                const sourcePos = this.toScreenCoords(source.x, source.y);
                const targetPos = this.toScreenCoords(target.x, target.y);
                return this.isPointNearLine(mouseX, mouseY, sourcePos, targetPos);
            });

            if (hoveredLink && hoveredLink.remarks) {
                tooltip.style.display = 'block';
                tooltip.style.left = `${e.clientX + 10}px`;
                tooltip.style.top = `${e.clientY + 10}px`;
                tooltip.textContent = hoveredLink.remarks;
            } else {
                tooltip.style.display = 'none';
            }
        }
    }

    handleMouseUp() {
        if (this.draggedNode) {
            this.saveToLocalStorage();
        }
        this.draggedNode = null;
        this.isPanning = false;
    }

    handleDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if double-clicked on a node or link
        const clickedNode = this.nodes.find(node => {
            const nodePos = this.toScreenCoords(node.x, node.y);
            const dx = nodePos.x - mouseX;
            const dy = nodePos.y - mouseY;
            return Math.sqrt(dx * dx + dy * dy) < 30 * this.scale;
        });

        if (clickedNode) {
            this.selectedNode = clickedNode;
            this.editNode();
        } else {
            const clickedLink = this.links.find(link => {
                const source = this.nodes.find(n => n.id === link.source_id);
                const target = this.nodes.find(n => n.id === link.target_id);
                if (!source || !target) return false;

                const sourcePos = this.toScreenCoords(source.x, source.y);
                const targetPos = this.toScreenCoords(target.x, target.y);
                return this.isPointNearLine(mouseX, mouseY, sourcePos, targetPos);
            });

            if (clickedLink) {
                this.selectedLink = clickedLink;
                this.editLink();
            }
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldPos = this.toWorldCoords(mouseX, mouseY);

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale *= zoomFactor;

        // Adjust offset to zoom toward mouse position
        this.offset.x = mouseX / this.scale - worldPos.x;
        this.offset.y = mouseY / this.scale - worldPos.y;

        this.draw();
    }

    // Context menu handlers
    showContextMenu(x, y) {
        const menu = document.getElementById('contextMenu');
        menu.style.display = 'block';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
    }

    handleEdit() {
        document.getElementById('contextMenu').style.display = 'none';
        if (this.selectedNode) {
            this.editNode();
        } else if (this.selectedLink) {
            this.editLink();
        }
    }

    handleDelete() {
        document.getElementById('contextMenu').style.display = 'none';
        if (this.selectedNode) {
            this.nodes = this.nodes.filter(n => n !== this.selectedNode);
            this.links = this.links.filter(l => 
                l.source_id !== this.selectedNode.id && 
                l.target_id !== this.selectedNode.id
            );
            this.selectedNode = null;
        } else if (this.selectedLink) {
            this.links = this.links.filter(l => l !== this.selectedLink);
            this.selectedLink = null;
        }
        this.saveToLocalStorage();
        this.draw();
    }

    // Helper functions
    editNode() {
        document.getElementById('nodeModalTitle').textContent = 'Edit Node';
        document.getElementById('nodeLabel').value = this.selectedNode.label;
        document.getElementById('nodeRemarks').value = this.selectedNode.remarks || '';
        document.getElementById('nodeModal').style.display = 'block';
    }

    editLink() {
        document.getElementById('linkModalTitle').textContent = 'Edit Link';
        document.getElementById('linkLabel').value = this.selectedLink.label || '';
        document.getElementById('linkRemarks').value = this.selectedLink.remarks || '';
        document.getElementById('linkModal').style.display = 'block';
    }

    isPointNearLine(x, y, start, end) {
        const lineLength = Math.sqrt(
            Math.pow(end.x - start.x, 2) + 
            Math.pow(end.y - start.y, 2)
        );
        
        const distance = Math.abs(
            (end.y - start.y) * x -
            (end.x - start.x) * y +
            end.x * start.y -
            end.y * start.x
        ) / lineLength;

        return distance < 5 &&
            x >= Math.min(start.x, end.x) - 5 &&
            x <= Math.max(start.x, end.x) + 5 &&
            y >= Math.min(start.y, end.y) - 5 &&
            y <= Math.max(start.y, end.y) + 5;
    }

    zoom(factor) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const worldCenter = this.toWorldCoords(centerX, centerY);
        
        this.scale *= factor;
        
        this.offset.x = centerX / this.scale - worldCenter.x;
        this.offset.y = centerY / this.scale - worldCenter.y;
        
        this.draw();
    }

    // Storage functions
    saveToLocalStorage() {
        localStorage.setItem('nodes', JSON.stringify(this.nodes));
        localStorage.setItem('links', JSON.stringify(this.links));
    }

    loadFromLocalStorage() {
        const nodes = localStorage.getItem('nodes');
        const links = localStorage.getItem('links');
        
        if (nodes) this.nodes = JSON.parse(nodes);
        if (links) this.links = JSON.parse(links);
        
        this.draw();
    }

    saveToFile() {
        const data = {
            nodes: this.nodes,
            links: this.links
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'node-link-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    loadFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = JSON.parse(event.target.result);
                this.nodes = data.nodes;
                this.links = data.links;
                this.saveToLocalStorage();
                this.draw();
            };
            reader.readAsText(file);
        };
        input.click();
    }
}

// Prevent context menu on right click
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Initialize the editor when the page loads
window.addEventListener('load', () => {
    new NodeLinkEditor();
});
