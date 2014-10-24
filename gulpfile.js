var gulp      = require('gulp');
var concat    = require('gulp-concat');
var sass      = require('gulp-ruby-sass');
var uglify    = require('gulp-uglify');
var rename    = require('gulp-rename');
var watch     = require('gulp-watch');
var plumber   = require('gulp-plumber');

gulp.task('script-concat', function() {
    return gulp
        .src('client-javascripts/*.js')
        .pipe(plumber())
        .pipe(concat('production.js'))
        .pipe(gulp.dest('./public/js/'))
});

gulp.task('script-minify', function() {
    gulp.src('public/js/production.js')
        .pipe(plumber())
        .pipe(uglify())
        .pipe(rename({ suffix : '-min' }))
        .pipe(gulp.dest('public/js/'))
});

gulp.task('sassify', function() {
    gulp.src('client-sass/style.sass')
        .pipe(plumber())
        .pipe(sass())
        .pipe(gulp.dest('public/css/'));
});

gulp.task('watch', function() {
  gulp.watch('client-javascripts/*', ['script-concat', 'script-minify']);
  gulp.watch('client-sass/*', ['sassify']);
  gulp.watch('client-sass/includes/*', ['sassify']);
});

gulp.task('default', ['script-concat', 'script-minify', 'sassify', 'watch']);
