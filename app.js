// Data structures
let nodes = [];
let links = [];

// Local storage keys
const NODES_KEY = 'nodes';
const LINKS_KEY = 'links';

// Canvas element
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// UI elements
const nodeModal = document.getElementById('nodeModal');
const linkModal = document.getElementById('linkModal');
const nodeForm = document.getElementById('nodeForm');
const linkForm = document.getElementById('linkForm');
const nodeLabelInput = document.getElementById('nodeLabel');
const nodeRemarksInput = document.getElementById('nodeRemarks');
const linkSourceInput = document.getElementById('linkSource');
const linkTargetInput = document.getElementById('linkTarget');
const linkLabelInput = document.getElementById('linkLabel');
const linkRemarksInput = document.getElementById('linkRemarks');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');

// Canvas state
let isDragging = false;
let selectedNode = null;
let offsetX, offsetY;
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let nextNodeId = 1;

// Function to save data to local storage
function saveToLocalStorage() {
  localStorage.setItem(NODES_KEY, JSON.stringify(nodes));
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

// Function to load data from local storage
function loadFromLocalStorage() {
  const storedNodes = localStorage.getItem(NODES_KEY);
  const storedLinks = localStorage.getItem(LINKS_KEY);
  if (storedNodes) {
    nodes = JSON.parse(storedNodes);
  }
  if (storedLinks) {
    links = JSON.parse(storedLinks);
  }
}

// Function to draw nodes on the canvas
function drawNodes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nodes.forEach(node => {
        const textWidth = ctx.measureText(node.label).width;
        const textHeight = 16; // Approximate text height
        const padding = 10;
        const rectWidth = Math.max(textWidth + 2 * padding, 50);
        const rectHeight = textHeight + 2 * padding;

        ctx.fillStyle = 'lightblue';
        ctx.fillRect(node.x - rectWidth / 2, node.y - rectHeight / 2, rectWidth, rectHeight);
        ctx.fillStyle = 'black';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x, node.y);
    });
}

// Function to draw links on the canvas
function drawLinks() {
    links.forEach(link => {
        const sourceNode = nodes.find(node => node.id === link.source_id);
        const targetNode = nodes.find(node => node.id === link.target_id);

        if (sourceNode && targetNode) {
            ctx.beginPath();
            ctx.moveTo(sourceNode.x, sourceNode.y);
            ctx.lineTo(targetNode.x, targetNode.y);
            ctx.strokeStyle = 'black';
            ctx.stroke();

            // Draw link label
            if (link.label) {
                const midX = (sourceNode.x + targetNode.x) / 2;
                const midY = (sourceNode.y + targetNode.y) / 2;
                ctx.fillStyle = 'black';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(link.label, midX, midY - 5);
            }
        }
    });
}

// Function to handle canvas clicks
let selectedNodesForLink = [];
let nextLinkId = 1;
function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let clickedNode = null;
    for (const node of nodes) {
        const textWidth = ctx.measureText(node.label).width;
        const textHeight = 16;
        const padding = 10;
        const rectWidth = Math.max(textWidth + 2 * padding, 50);
        const rectHeight = textHeight + 2 * padding;

        if (x >= node.x - rectWidth / 2 && x <= node.x + rectWidth / 2 &&
            y >= node.y - rectHeight / 2 && y <= node.y + rectHeight / 2) {
            clickedNode = node;
            break;
        }
    }

    if (clickedNode) {
        selectedNodesForLink.push(clickedNode);
        if (selectedNodesForLink.length === 2) {
            linkModal.style.display = 'block';
            linkSourceInput.value = selectedNodesForLink[0].id;
            linkTargetInput.value = selectedNodesForLink[1].id;
            linkLabelInput.value = '';
            linkRemarksInput.value = '';

            linkForm.onsubmit = function(e) {
                e.preventDefault();
                const sourceId = parseInt(linkSourceInput.value);
                const targetId = parseInt(linkTargetInput.value);
                const label = linkLabelInput.value;
                const remarks = linkRemarksInput.value;

                const newLink = {
                    id: nextLinkId++,
                    source_id: sourceId,
                    target_id: targetId,
                    label: label,
                    remarks: remarks
                };
                links.push(newLink);
                saveToLocalStorage();
                linkModal.style.display = 'none';
                selectedNodesForLink = [];
                drawNodes();
                drawLinks();
            };
        }
    } else {
        nodeModal.style.display = 'block';
        nodeLabelInput.value = '';
        nodeRemarksInput.value = '';

        nodeForm.onsubmit = function(e) {
            e.preventDefault();
            const label = nodeLabelInput.value;
            const remarks = nodeRemarksInput.value;

            const newNode = {
                id: nextNodeId++,
                label: label,
                x: x,
                y: y,
                remarks: remarks
            };
            nodes.push(newNode);
            saveToLocalStorage();
            nodeModal.style.display = 'none';
            drawNodes();
            drawLinks();
        };
    }
}

// Function to handle node dragging
function handleNodeDrag(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (event.type === 'mousedown') {
        for (const node of nodes) {
            const textWidth = ctx.measureText(node.label).width;
            const textHeight = 16;
            const padding = 10;
            const rectWidth = Math.max(textWidth + 2 * padding, 50);
            const rectHeight = textHeight + 2 * padding;

            if (x >= node.x - rectWidth / 2 && x <= node.x + rectWidth / 2 &&
                y >= node.y - rectHeight / 2 && y <= node.y + rectHeight / 2) {
                isDragging = true;
                selectedNode = node;
                offsetX = x - node.x;
                offsetY = y - node.y;
                break;
            }
        }
    } else if (event.type === 'mousemove') {
        if (isDragging && selectedNode) {
            selectedNode.x = x - offsetX;
            selectedNode.y = y - offsetY;
            drawNodes();
            drawLinks();
        }
    } else if (event.type === 'mouseup') {
        if (isDragging && selectedNode) {
            isDragging = false;
            selectedNode = null;
            saveToLocalStorage();
        }
    }
}

// Function to handle node editing
function handleNodeEdit(node) {
    nodeModal.style.display = 'block';
    nodeLabelInput.value = node.label;
    nodeRemarksInput.value = node.remarks;

    nodeForm.onsubmit = function(e) {
        e.preventDefault();
        node.label = nodeLabelInput.value;
        node.remarks = nodeRemarksInput.value;
        saveToLocalStorage();
        nodeModal.style.display = 'none';
        drawNodes();
        drawLinks();
    };
}

// Function to handle link editing
function handleLinkEdit(link) {
    linkModal.style.display = 'block';
    linkSourceInput.value = link.source_id;
    linkTargetInput.value = link.target_id;
    linkLabelInput.value = link.label;
    linkRemarksInput.value = link.remarks;

    linkForm.onsubmit = function(e) {
        e.preventDefault();
        link.source_id = parseInt(linkSourceInput.value);
        link.target_id = parseInt(linkTargetInput.value);
        link.label = linkLabelInput.value;
        link.remarks = linkRemarksInput.value;
        saveToLocalStorage();
        linkModal.style.display = 'none';
        drawNodes();
        drawLinks();
    };
}

// Function to handle node deletion
function handleNodeDelete(node) {
    nodes = nodes.filter(n => n.id !== node.id);
    links = links.filter(link => link.source_id !== node.id && link.target_id !== node.id);
    saveToLocalStorage();
    drawNodes();
    drawLinks();
}

// Function to handle link deletion
function handleLinkDelete(link) {
    links = links.filter(l => l.id !== link.id);
    saveToLocalStorage();
    drawNodes();
    drawLinks();
}

// Context menu
const contextMenu = document.getElementById('contextMenu');
const editButton = document.getElementById('editButton');
const deleteButton = document.getElementById('deleteButton');
let selectedElement = null;

canvas.addEventListener('contextmenu', function(event) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let clickedNode = null;
    for (const node of nodes) {
        const textWidth = ctx.measureText(node.label).width;
        const textHeight = 16;
        const padding = 10;
        const rectWidth = Math.max(textWidth + 2 * padding, 50);
        const rectHeight = textHeight + 2 * padding;

        if (x >= node.x - rectWidth / 2 && x <= node.x + rectWidth / 2 &&
            y >= node.y - rectHeight / 2 && y <= node.y + rectHeight / 2) {
            clickedNode = node;
            break;
        }
    }

    let clickedLink = null;
    for (const link of links) {
        const sourceNode = nodes.find(node => node.id === link.source_id);
        const targetNode = nodes.find(node => node.id === link.target_id);

        if (sourceNode && targetNode) {
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;
            const dx = x - midX;
            const dy = y - midY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 10) {
                clickedLink = link;
                break;
            }
        }
    }

    if (clickedNode) {
        selectedElement = clickedNode;
    } else if (clickedLink) {
        selectedElement = clickedLink;
    } else {
        selectedElement = null;
        contextMenu.style.display = 'none';
        return;
    }

    contextMenu.style.display = 'block';
    contextMenu.style.left = event.clientX + 'px';
    contextMenu.style.top = event.clientY + 'px';
});

editButton.addEventListener('click', function() {
    contextMenu.style.display = 'none';
    if (selectedElement) {
        if (selectedElement.label) {
            handleNodeEdit(selectedElement);
        } else {
            handleLinkEdit(selectedElement);
        }
    }
});

deleteButton.addEventListener('click', function() {
    contextMenu.style.display = 'none';
    if (selectedElement) {
         if (selectedElement.label) {
            handleNodeDelete(selectedElement);
        } else {
            handleLinkDelete(selectedElement);
        }
    }
});

// Function to handle saving to file
function handleSaveToFile() {
    const data = {
        nodes: nodes,
        links: links
    };
    const json = JSON.stringify(data);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'node_link_config.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Function to handle loading from file
function handleLoadFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);
                nodes = data.nodes;
                links = data.links;
                saveToLocalStorage();
                drawNodes();
                drawLinks();
            } catch (error) {
                console.error('Error parsing JSON file:', error);
                alert('Error loading file. Please ensure it is a valid JSON file.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Event listeners
canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('mousedown', handleNodeDrag);
canvas.addEventListener('mousemove', handleNodeDrag);
canvas.addEventListener('mouseup', handleNodeDrag);
saveButton.addEventListener('click', handleSaveToFile);
loadButton.addEventListener('click', handleLoadFromFile);

// Load data from local storage on page load
loadFromLocalStorage();

// Initial draw
drawNodes();
drawLinks();