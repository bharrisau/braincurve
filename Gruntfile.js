module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    combine: {
      single: {
        input: "./src/braincurve.html",
        output: "./index.html",
        tokens: [
          { token: "//braincurve.js", file: "./dst/braincurve.js" },
          { token: "//keccak32.js", file: "./src/keccak32.js" },
          { token: "//catena.js", file: "./dst/catena.js" }
        ]
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      options: {
        // options here to override JSHint defaults
        globals: {
          jQuery: true,
          console: true,
          module: true,
          document: true
        }
      }
    },
    watch: {
      files: ['src/*.html', '<%= jshint.files %>', '<%= coffeelint.app %>'],
      tasks: ['jshint', 'coffeelint', 'coffee:compile', 'combine:single']
    },
    coffeelint: {
      app: ['src/**/*.coffee']
    },
    coffee: {
      compile: {
        options: {
          bare: true
        },
        expand: true,
        flatten: true,
        cwd: '.',
        src: ['<%= coffeelint.app %>'],
        dest: 'dst/',
        ext: '.js'
      }
    }
  });

  grunt.file.defaultEncoding = 'utf-8';
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-coffeelint');
  grunt.loadNpmTasks("grunt-combine");
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.registerTask("default", ["combine:single"]);
};
