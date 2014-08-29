# toolchain
gulp = require 'gulp'
karma = require 'karma'
watch = require 'gulp-watch'
jshint = require 'gulp-jshint'
nodemon = require 'gulp-nodemon'

# processors
sass = require 'gulp-sass'
cssmin = require 'gulp-cssmin'
imagemin = require 'gulp-imagemin'

# paths
srcDir = "#{__dirname}/src"
libDir = "#{__dirname}/lib"
workDir = "#{__dirname}/dist"
testDir = "#{__dirname}/test"

# build
gulp.task 'default', ->
  [
    # compile, minify, and copy scss
    gulp.src([
      "#{srcDir}/scss/**/*.scss"
      "#{libDir}/**/*.css"
    ]).pipe(watch()).pipe(sass()).pipe(cssmin()).pipe(gulp.dest("#{workDir}/css"))
    gulp.src("#{srcDir}/img/**/*").pipe(watch()).pipe(imagemin()).pipe(gulp.dest("#{workDir}/img"))

    # lint and copy js
    gulp.src([
      "#{srcDir}/js/**/*.js"
      "#{libDir}/**/*.js"
    ]).pipe(watch()).pipe(jshint()).pipe(gulp.dest("#{workDir}/js"))
    gulp.src("#{srcDir}/html/**/*.html").pipe(watch()).pipe(gulp.dest(workDir))

    # copy fontawesome fonts
    gulp.src("#{libDir}/fontawesome/fonts/*").pipe(gulp.dest("#{workDir}/css/fontawesome/fonts"))
  ]

# live reload
gulp.task 'dev', ['default'], ->
  nodemon({
    cwd: __dirname
    script: "#{srcDir}/app.js"
    ext: 'html js css'
    env: {'NODE_ENV': 'development'}
    ignore: ["#{workDir}/**/*"]
  })

# testing
gulp.task 'test', ['default'], ->
  karma.server.start
    configFile: "#{testDir}/karma.conf.js"
    singleRun: true