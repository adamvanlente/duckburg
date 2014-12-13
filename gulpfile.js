var gulp      = require('gulp');
var concat    = require('gulp-concat');
var sass      = require('gulp-ruby-sass');
var uglify    = require('gulp-uglify');
var rename    = require('gulp-rename');
var watch     = require('gulp-watch');
var plumber   = require('gulp-plumber');

gulp.task('script-concat', function() {
    return gulp
        .src(['client-javascripts/*.js'])
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

gulp.task('sass-style', function() {
    gulp.src('client-sass/style.sass')
        .pipe(plumber())
        .pipe(sass())
        .pipe(gulp.dest('public/css/'));
});

gulp.task('sass-invoice', function() {
  gulp.src('client-sass/invoice.sass')
  .pipe(plumber())
  .pipe(sass())
  .pipe(gulp.dest('public/css/'));
});

gulp.task('sass-cpe', function() {
  gulp.src('client-sass/retailSiteStyles.sass')
  .pipe(plumber())
  .pipe(sass())
  .pipe(gulp.dest('public/css/'));
});

gulp.task('watch', function() {
  gulp.watch('client-javascripts/*', ['script-concat', 'script-minify']);
  gulp.watch('client-javascripts/views/*', ['script-concat', 'script-minify']);
  gulp.watch('client-javascripts/forms/*', ['script-concat', 'script-minify']);
  gulp.watch('client-javascripts/requests/*', ['script-concat', 'script-minify']);
  gulp.watch('client-sass/style.sass', ['sass-style']);
  gulp.watch('client-sass/includes/*', ['sass-style']);
  gulp.watch('client-sass/invoice.sass', ['sass-invoice']);
  gulp.watch('client-sass/retailSiteStyles.sass', ['sass-cpe']);
});

gulp.task('default', ['script-concat', 'script-minify', 'sass-style', 'sass-invoice', 'sass-cpe', 'watch']);
