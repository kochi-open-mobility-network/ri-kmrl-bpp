module.exports = {
    apps: [
        {
            name: "KMRL_BPP Service",
            script: 'dist/src/index.js',
            watch: false,
            instances: 2,
            exec_mode: "cluster",
        }
    ]
}
