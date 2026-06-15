console.log("This is node.js script running")


setTimeout(() => {
  console.log("This is a message from the script")
}, 180_000)

// docker build -t simple_node_script_2 .