<template>
<div class="app-root-wrapper">
  <!-- 🍏 Mode 1: macOS 26 Desktop Mode (DEFAULT) -->
  <MacDesktop
    v-if="uiMode === 'macos'"
    ref="macDesktopRef"
    :files="filteredFiles"
    :folders="filteredFolders"
    :all-files="allBucketFiles"
    :apps-metadata="appsMetadata"
    :cwd="cwd"
    :storage-id="storageId"
    :storage-options="storageOptions"
    :theme="theme"
    :loading="loading"
    :view-mode="viewMode"
    :search="search"
    :filter-category="filterCategory"
    :auth-credentials="authCredentials"
    :category-counts="categoryCounts"
    :total-storage-bytes="totalStorageBytes"
    @navigate="goToFolder"
    @open-file="openFile"
    @upload="openUploadWithAuth"
    @upload-to-folder="uploadFiles($event.files, $event.targetFolder)"
    @init-system-folders="autoInitSystemFolders"
    @save-apps-metadata="saveAppsMetadata"
    @create-folder="createFolder"
    @rename="renameFile"
    @move="moveFile"
    @delete="removeFile"
    @copy-item="clipboard = { action: 'copy', item: $event }"
    @cut-item="clipboard = { action: 'cut', item: $event }"
    @paste="pasteFile"
    @share="shareModal = { visible: true, file: $event, rawUrl: rawPath($event.key) }"
    @inspect="inspector = { visible: true, file: $event }"
    @edit="textEditor = { visible: true, file: $event }"
    @toggle-theme="toggleTheme"
    @switch-storage="storageId = $event"
    @switch-mode="switchUiMode"
    @login="login"
    @logout="logout"
    @refresh="fetchFiles(true)"
    @update:view-mode="viewMode = $event"
    @update:filter-category="selectCategory"
    @update:search="search = $event"
    @context="openContext($event.item, $event.event)"
    @drop-files="handleMacDropFiles"
    @action="handleMacAction"
  />

  <!-- 🏛️ Mode 2: Classic Studio Showcase Mode -->
  <div v-else class="studio-app" @click="closeContext" @contextmenu.prevent="openContext(null, $event)" @dragenter.prevent="onDragEnter" @dragover.prevent @dragleave="onDragLeave" @drop.prevent="onDrop">
    <!-- Left Glassmorphism Sidebar -->
    <aside class="studio-sidebar">
      <div class="sidebar-brand">
        <CatLogo />
        <div class="brand-text">
          <strong>天才猫 R2 网盘</strong>
          <span class="status-dot"><i class="dot"></i> 智能直连中</span>
        </div>
      </div>

      <!-- Category Navigation Menu -->
      <nav class="sidebar-nav">
        <div class="nav-section-title">媒体 Showcase 库</div>
        
        <button class="nav-item nav-all" :class="{ active: filterCategory === 'all' }" @click="selectCategory('all')">
          <i class="ph ph-squares-four"></i>
          <span>概览大厅</span>
          <span class="count-pill">{{ totalItemCount }}</span>
        </button>

        <button class="nav-item nav-image" :class="{ active: filterCategory === 'image' }" @click="selectCategory('image')">
          <i class="ph ph-image"></i>
          <span>照片图库</span>
          <span class="count-pill highlight-blue">{{ categoryCounts.image }}</span>
        </button>

        <button class="nav-item nav-video" :class="{ active: filterCategory === 'video' }" @click="selectCategory('video')">
          <i class="ph ph-film-strip"></i>
          <span>高清影音</span>
          <span class="count-pill highlight-purple">{{ categoryCounts.video }}</span>
        </button>

        <button class="nav-item nav-audio" :class="{ active: filterCategory === 'audio' }" @click="selectCategory('audio')">
          <i class="ph ph-music-notes"></i>
          <span>音乐曲库</span>
          <span class="count-pill highlight-green">{{ categoryCounts.audio }}</span>
        </button>

        <button class="nav-item nav-archive" :class="{ active: filterCategory === 'archive' }" @click="selectCategory('archive')">
          <i class="ph ph-package"></i>
          <span>压缩归档</span>
          <span class="count-pill highlight-amber">{{ categoryCounts.archive }}</span>
        </button>

        <button class="nav-item nav-document" :class="{ active: filterCategory === 'document' }" @click="selectCategory('document')">
          <i class="ph ph-file-text"></i>
          <span>文档资料</span>
          <span class="count-pill">{{ categoryCounts.document }}</span>
        </button>

        <div class="nav-section-title" style="margin-top:14px;">应用与工具</div>
        <button class="nav-item nav-software" :class="{ active: filterCategory === 'software' }" @click="selectCategory('software')">
          <i class="ph ph-app-store-logo"></i>
          <span>软件工坊</span>
          <span class="count-pill highlight-teal">{{ categoryCounts.software }}</span>
        </button>
      </nav>

      <!-- Sidebar Footer User Status & Actions -->
      <div class="sidebar-footer">
        <div class="user-status-pill" :class="{ authenticated: !!authCredentials }">
          <div class="user-avatar-badge">
            <i class="ph" :class="authCredentials ? 'ph-user-check-bold' : 'ph-user-bold'"></i>
          </div>
          <div class="user-text-meta">
            <strong class="user-name">{{ authCredentials ? authCredentials.username : '访客体验模式' }}</strong>
            <span class="user-role">{{ authCredentials ? '管理员已鉴权' : '仅开放公开资源' }}</span>
          </div>
          <button v-if="!authCredentials" class="login-quick-btn" type="button" title="登录以管理文件" @click="promptLogin()">登录</button>
          <button v-else class="logout-quick-btn" type="button" title="退出登录" @click="logout"><i class="ph ph-sign-out"></i></button>
        </div>
      </div>
    </aside>

    <!-- Main Content Body -->
    <main class="studio-main">
      <header class="topbar">
        <!-- Minimal Apple Spotlight Icon Search Button / Expandable Search Pill -->
        <div class="search-wrapper">
          <button v-if="!showSearchInput && !search" class="icon-button search-icon-btn" type="button" title="搜索资源 (⌘K)" @click="showSearchInput = true; $nextTick(() => $refs.searchInputRef?.focus())">
            <i class="ph ph-magnifying-glass"></i>
          </button>
          <label v-else class="search-box search-box-expanded">
            <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
            <input ref="searchInputRef" v-model.trim="search" type="search" placeholder="搜索资源..." aria-label="搜索当前目录资源" @blur="onSearchBlur" />
            <button class="icon-button small" type="button" title="关闭搜索" @click="search = ''; showSearchInput = false">×</button>
          </label>
        </div>

        <div class="topbar-actions">
          <label class="storage-switcher" title="切换存储桶"><i class="ph ph-database"></i><select v-model="storageId" aria-label="选择存储桶"><option v-for="storage in storageOptions" :key="storage.id" :value="storage.id">{{ storage.label }}</option></select></label>
          <button class="icon-button theme-toggle-btn" type="button" :title="theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'" @click="toggleTheme">
            <i class="ph" :class="theme === 'dark' ? 'ph-moon-stars-fill' : 'ph-sun-dim-fill'"></i>
          </button>
          <button class="icon-button" type="button" title="切换至 macOS 桌面模式" @click="switchUiMode('macos')">
            <i class="ph ph-desktop"></i>
          </button>
          <button class="icon-button" type="button" title="快捷键指南 (?)" @click="showHotkeysModal = true"><i class="ph ph-keyboard"></i></button>
          <button class="icon-button" type="button" title="刷新目录" @click="fetchFiles(true)"><i class="ph ph-arrows-clockwise" aria-hidden="true"></i></button>
          <div class="menu-button"><button class="icon-button" type="button" title="显示选项" @click="showMenu = true"><i class="ph ph-sliders-horizontal" aria-hidden="true"></i></button><Menu v-model="showMenu" :items="menuItems" @click="onMenuClick" /></div>
        </div>
      </header>

      <section class="workspace" :class="{ 'pure-gallery-workspace': filterCategory !== 'all', 'software-workspace': filterCategory === 'software' }">
        <!-- Portal Hero Banner & R2 Storage Animated Widget (ONLY shown in General Overview Hall) -->
        <div v-if="filterCategory === 'all'" class="portal-hero">
          <div class="hero-content">
            <div class="hero-header-row">
              <span class="hero-tag"><i class="ph ph-sparkle-fill"></i> 天才猫 AI 云端引擎</span>
              <span v-if="autoGlobalScan" class="scan-tag"><i class="ph ph-lightning-fill"></i> 全盘秒级索引就绪</span>
            </div>
            <h1>天才猫 R2 智能云端展厅</h1>
            <p>直连 Cloudflare R2 全球边缘存储 · 在线影音播放 · 归档解压预览 · 全速传输</p>
            
            <!-- Category Quick Badges -->
            <div class="hero-stat-pills">
              <span class="hero-pill" @click="selectCategory('image')"><i class="ph ph-image-fill"></i> {{ categoryCounts.image }} 照片</span>
              <span class="hero-pill" @click="selectCategory('video')"><i class="ph ph-film-strip-fill"></i> {{ categoryCounts.video }} 视频</span>
              <span class="hero-pill" @click="selectCategory('audio')"><i class="ph ph-music-notes-fill"></i> {{ categoryCounts.audio }} 音乐</span>
              <span class="hero-pill" @click="selectCategory('software')"><i class="ph ph-app-store-logo-fill"></i> {{ categoryCounts.software }} 软件</span>
              <span class="hero-pill" @click="selectCategory('archive')"><i class="ph ph-package-fill"></i> {{ categoryCounts.archive }} 归档</span>
            </div>
          </div>

          <!-- Apple macOS High-End Storage Card -->
          <div class="r2-storage-widget">
            <div class="storage-widget-header">
              <div class="storage-title-group">
                <div class="storage-icon-circle"><i class="ph ph-database-fill"></i></div>
                <div>
                  <h3>Cloudflare R2 存储节点</h3>
                  <p>{{ storageId === 'default' ? '主存储桶 (Primary Bucket)' : `存储桶 · ${storageId}` }}</p>
                </div>
              </div>
              <div class="storage-capacity-pill">
                <span class="pulse-light"></span>
                <span>{{ storagePercent.toFixed(1) }}% 容量</span>
              </div>
            </div>

            <!-- Storage Metrics Numbers -->
            <div class="storage-metrics-row">
              <div class="metric-block">
                <span class="metric-label">已用容量</span>
                <span class="metric-value font-mono">{{ formatSize(totalStorageBytes) }}</span>
              </div>
              <div class="metric-block">
                <span class="metric-label">预估上限</span>
                <span class="metric-value font-mono">10.0 TB</span>
              </div>
              <div class="metric-block">
                <span class="metric-label">总对象数</span>
                <span class="metric-value font-mono">{{ totalItemCount }} 项</span>
              </div>
            </div>

            <!-- Multi-Color Segmented Animated Progress Bar -->
            <div class="storage-bar-track">
              <div class="bar-shimmer"></div>
              <div class="storage-bar-seg seg-image" :style="{ width: (totalStorageBytes ? (categoryBytes.image / totalStorageBytes) * storagePercent : 0) + '%' }" title="照片"></div>
              <div class="storage-bar-seg seg-video" :style="{ width: (totalStorageBytes ? (categoryBytes.video / totalStorageBytes) * storagePercent : 0) + '%' }" title="视频"></div>
              <div class="storage-bar-seg seg-audio" :style="{ width: (totalStorageBytes ? (categoryBytes.audio / totalStorageBytes) * storagePercent : 0) + '%' }" title="音频"></div>
              <div class="storage-bar-seg seg-software" :style="{ width: (totalStorageBytes ? (categoryBytes.software / totalStorageBytes) * storagePercent : 0) + '%' }" title="软件"></div>
              <div class="storage-bar-seg seg-archive" :style="{ width: (totalStorageBytes ? (categoryBytes.archive / totalStorageBytes) * storagePercent : 0) + '%' }" title="归档"></div>
              <div class="storage-bar-seg seg-document" :style="{ width: (totalStorageBytes ? (categoryBytes.document / totalStorageBytes) * storagePercent : 0) + '%' }" title="文档"></div>
            </div>

            <!-- Legend Breakdown Badges -->
            <div class="storage-legend">
              <span class="legend-badge badge-image" @click="selectCategory('image')"><i class="ph ph-image-fill"></i> 照片 <strong>{{ formatSize(categoryBytes.image) }}</strong></span>
              <span class="legend-badge badge-video" @click="selectCategory('video')"><i class="ph ph-film-strip-fill"></i> 视频 <strong>{{ formatSize(categoryBytes.video) }}</strong></span>
              <span class="legend-badge badge-audio" @click="selectCategory('audio')"><i class="ph ph-music-notes-fill"></i> 音频 <strong>{{ formatSize(categoryBytes.audio) }}</strong></span>
              <span class="legend-badge badge-software" @click="selectCategory('software')"><i class="ph ph-app-store-logo-fill"></i> 软件 <strong>{{ formatSize(categoryBytes.software) }}</strong></span>
              <span class="legend-badge badge-archive" @click="selectCategory('archive')"><i class="ph ph-package-fill"></i> 归档 <strong>{{ formatSize(categoryBytes.archive) }}</strong></span>
            </div>
          </div>
        </div>

        <!-- Workspace Heading / Breadcrumbs (ONLY shown in General Overview Hall) -->
        <div v-if="filterCategory === 'all'" class="workspace-heading">
          <div>
            <nav class="breadcrumbs" aria-label="当前位置"><button type="button" @click="goToFolder('')">首页</button><template v-for="(part, index) in pathParts" :key="`${part}-${index}`"><span aria-hidden="true">/</span><button type="button" @click="goToFolder(pathUntil(index))">{{ part }}</button></template></nav>
            <h2>{{ currentFolderName }}</h2>
            <p>{{ itemCountText }}</p>
          </div>
          <div class="view-controls" aria-label="视图设置"><button class="view-button" :class="{ active: viewMode === 'grid' }" type="button" title="网格视图" @click="viewMode = 'grid'"><i class="ph ph-squares-four" aria-hidden="true"></i></button><button class="view-button" :class="{ active: viewMode === 'list' }" type="button" title="列表视图" @click="viewMode = 'list'"><i class="ph ph-list-bullets" aria-hidden="true"></i></button></div>
        </div>

        <!-- Category Showcase Header (shown in Image, Video, Audio, Software, Archive, Document) -->
        <div v-else class="category-showcase-header" :class="`header--${filterCategory}`">
          <div class="category-header-main">
            <div class="category-icon-halo">
              <i class="ph" :class="getCategoryIcon(filterCategory)"></i>
            </div>
            <div class="category-text-col">
              <h2>{{ categoryMeta.title }}</h2>
              <p>{{ categoryMeta.desc }}</p>
            </div>
            <div class="category-view-controls">
              <button class="view-button" :class="{ active: viewMode === 'grid' }" type="button" title="网格视图" @click="viewMode = 'grid'"><i class="ph ph-squares-four" aria-hidden="true"></i></button>
              <button class="view-button" :class="{ active: viewMode === 'list' }" type="button" title="列表视图" @click="viewMode = 'list'"><i class="ph ph-list-bullets" aria-hidden="true"></i></button>
            </div>
          </div>

          <!-- Special Toolbar for Software Category -->
          <div v-if="filterCategory === 'software'" class="software-showcase-toolbar">
            <div class="software-filters-row">
              <!-- Platform Segmented Tabs -->
              <div class="software-platform-chips">
                <button :class="{ active: studioSoftwarePlatform === 'all' }" type="button" @click="studioSoftwarePlatform = 'all'">全部 ({{ studioSoftwareCounts.all }})</button>
                <button :class="{ active: studioSoftwarePlatform === 'mac' }" type="button" @click="studioSoftwarePlatform = 'mac'">🍎 macOS ({{ studioSoftwareCounts.mac }})</button>
                <button :class="{ active: studioSoftwarePlatform === 'win' }" type="button" @click="studioSoftwarePlatform = 'win'">🪟 Windows ({{ studioSoftwareCounts.win }})</button>
                <button :class="{ active: studioSoftwarePlatform === 'mobile' }" type="button" @click="studioSoftwarePlatform = 'mobile'">📱 移动端 ({{ studioSoftwareCounts.mobile }})</button>
                <button :class="{ active: studioSoftwarePlatform === 'linux' }" type="button" @click="studioSoftwarePlatform = 'linux'">🐧 Linux ({{ studioSoftwareCounts.linux }})</button>
              </div>

              <button class="software-publish-btn" type="button" @click="openUploadWithAuth('软件/')">
                <i class="ph ph-plus-circle-fill"></i>
                <span>发布软件并填写简介</span>
              </button>
            </div>

            <!-- Subcategory chips -->
            <div class="software-cat-chips">
              <button :class="{ active: studioSoftwareSubCat === 'all' }" type="button" @click="studioSoftwareSubCat = 'all'">全部类别</button>
              <button :class="{ active: studioSoftwareSubCat === 'design' }" type="button" @click="studioSoftwareSubCat = 'design'">🎨 设计创意</button>
              <button :class="{ active: studioSoftwareSubCat === 'productivity' }" type="button" @click="studioSoftwareSubCat = 'productivity'">⚡ 效率办公</button>
              <button :class="{ active: studioSoftwareSubCat === 'developer' }" type="button" @click="studioSoftwareSubCat = 'developer'">💻 开发工具</button>
              <button :class="{ active: studioSoftwareSubCat === 'utilities' }" type="button" @click="studioSoftwareSubCat = 'utilities'">🛠️ 系统工具</button>
              <button :class="{ active: studioSoftwareSubCat === 'entertainment' }" type="button" @click="studioSoftwareSubCat = 'entertainment'">🎬 影音娱乐</button>
              <button :class="{ active: studioSoftwareSubCat === 'network' }" type="button" @click="studioSoftwareSubCat = 'network'">🌐 网络通讯</button>
            </div>
          </div>
        </div>

        <!-- Loading skeleton -->
        <section v-if="loading" class="file-grid loading-grid" :class="viewMode"><div v-for="item in 8" :key="item" class="file-skeleton"></div></section>

        <!-- Empty state -->
        <section v-else-if="!filteredFiles.length && !filteredFolders.length" class="empty-state-wrap">
          <!-- Subfolder Parent Nav Card -->
          <div v-if="cwd && filterCategory === 'all'" class="empty-parent-nav">
            <article class="file-card parent-card" tabindex="0" @click="goToFolder(parentPath)" @keydown.enter="goToFolder(parentPath)">
              <div class="file-symbol folder-symbol"><i class="ph ph-arrow-bend-up-left"></i></div>
              <div class="file-main"><strong>上一级目录</strong><span>返回父文件夹</span></div>
            </article>
          </div>

          <!-- VisionOS Empty Showcase Card -->
          <div class="empty-showcase-card">
            <div class="empty-glow-bubble">
              <i class="ph" :class="filterCategory === 'image' ? 'ph-image-broken' : (filterCategory === 'video' ? 'ph-film-slash' : (filterCategory === 'audio' ? 'ph-music-notes-simple' : (search ? 'ph-magnifying-glass' : 'ph-folder-dashed')))"></i>
            </div>
            <h3>{{ search ? '没有匹配的资源' : (cwd ? '当前文件夹为空' : '当前分类暂无文件') }}</h3>
            <p>{{ search ? '尝试更换搜索关键词或清除筛选条件。' : '直接将本地文件拖放至此窗口，或点击下方按钮开始上传。' }}</p>
            <div class="empty-action-group">
              <button v-if="!search" class="empty-cta-btn primary" type="button" @click="openUploadWithAuth">
                <i class="ph ph-cloud-arrow-up-bold"></i>
                <span>立即上传文件</span>
              </button>
              <button v-if="cwd && !search" class="empty-cta-btn secondary" type="button" @click="createFolder">
                <i class="ph ph-folder-plus-bold"></i>
                <span>新建子文件夹</span>
              </button>
            </div>
          </div>
        </section>

        <!-- File Grid (Supports Masonry Waterfall, Video Cinema Gallery, Music Vinyl Studio, and Software Workshop Layouts) -->
        <section v-else class="file-grid" :class="[viewMode, { 'waterfall-mode': filterCategory === 'image' && viewMode === 'grid', 'video-studio-mode': filterCategory === 'video' && viewMode === 'grid', 'music-studio-mode': filterCategory === 'audio' && viewMode === 'grid', 'software-studio-mode': filterCategory === 'software' }]">
          
          <article v-if="cwd && filterCategory === 'all'" class="file-card parent-card" tabindex="0" @click="goToFolder(parentPath)" @keydown.enter="goToFolder(parentPath)">
            <div class="file-symbol folder-symbol"><i class="ph ph-arrow-bend-up-left"></i></div>
            <div class="file-main"><strong>上一级目录</strong><span>返回父文件夹</span></div>
          </article>

          <article v-for="folder in filteredFolders" :key="folder" class="file-card folder-card" tabindex="0" @click="goToFolder(folder)" @keydown.enter="goToFolder(folder)" @contextmenu.stop.prevent="openContext(folder, $event)">
            <div class="file-symbol folder-symbol"><i class="ph ph-folder-simple-star"></i></div>
            <div class="file-main">
              <strong>{{ folderName(folder) }}</strong>
              <span>分类目录</span>
            </div>
            <button class="more-button" type="button" title="更多操作" @click.stop="openContext(folder, $event)"><i class="ph ph-dots-three-outline"></i></button>
          </article>

          <!-- SPECIALIZED CATEGORY CARDS -->
          <article
            v-for="file in filteredFiles"
            :key="file.key"
            class="file-card"
            :class="[isImage(file) ? 'file-card--image' : (isVideo(file) ? 'file-card--video' : (isAudio(file) ? 'file-card--audio' : (isSoftware(file) ? 'file-card--software' : (isArchive(file) ? 'file-card--archive' : 'file-card--document'))))]"
            tabindex="0"
            @click="openFile(file)"
            @keydown.enter="openFile(file)"
            @contextmenu.stop.prevent="openContext(file, $event)"
          >
            <!-- 1A. PURE FULL HD PHOTO WATERFALL MASONRY CARD (ONLY IN PHOTO GALLERY VIEW) -->
            <template v-if="isImage(file) && filterCategory === 'image' && viewMode === 'grid'">
              <div class="photo-preview-pure">
                <img :src="imageUrl(file)" loading="lazy" :alt="fileName(file.key)" />
                <div class="photo-hover-overlay">
                  <div class="photo-overlay-top">
                    <span class="photo-tag-badge">{{ fileName(file.key) }}</span>
                  </div>
                  <div class="photo-overlay-bottom">
                    <span class="photo-size-badge">{{ formatSize(file.size) }}</span>
                    <div class="photo-overlay-actions">
                      <button class="overlay-btn" type="button" title="大图幻灯片预览" @click.stop="openFile(file)">
                        <i class="ph ph-arrows-out"></i>
                      </button>
                      <a class="overlay-btn" :href="rawPath(file.key)" download title="下载原图" @click.stop>
                        <i class="ph ph-download-simple"></i>
                      </a>
                      <button class="overlay-btn" type="button" title="更多选项" @click.stop="openContext(file, $event)">
                        <i class="ph ph-dots-three-outline"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- 1B. FOLDER VIEW IMAGE CARD (CONTAINED THUMBNAIL + TITLE + SIZE + DATE) -->
            <template v-else-if="isImage(file)">
              <div class="folder-image-preview">
                <img :src="imageUrl(file)" loading="lazy" :alt="fileName(file.key)" />
              </div>
              <div class="file-main">
                <strong :title="fileName(file.key)" v-html="highlightText(fileName(file.key))"></strong>
                <span>{{ formatDate(file.uploaded) }} · 照片</span>
              </div>
              <button class="more-button" type="button" title="更多操作" @click.stop="openContext(file, $event)"><i class="ph ph-dots-three-outline"></i></button>
              <div class="file-footer">
                <strong>{{ formatSize(file.size) }}</strong>
                <span class="file-action-hint"><i class="ph ph-eye"></i> 预览</span>
              </div>
            </template>

            <!-- 2. VIDEO CINEMA STREAMING CARD -->
            <template v-else-if="isVideo(file)">
              <div class="photo-preview video-cinema-preview">
                <img :src="imageUrl(file)" loading="lazy" :alt="fileName(file.key)" />
                <div class="video-play-badge">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z"/>
                  </svg>
                </div>
              </div>
              <div class="file-main">
                <strong :title="fileName(file.key)" v-html="highlightText(fileName(file.key))"></strong>
                <span>{{ formatDate(file.uploaded) }} · 高清视频</span>
              </div>
              <footer class="file-footer">
                <span>大小</span><strong>{{ formatSize(file.size) }}</strong>
              </footer>
              <button class="more-button" type="button" title="更多操作" @click.stop="openContext(file, $event)"><i class="ph ph-dots-three-outline"></i></button>
            </template>

            <!-- 3. MUSIC VINYL PLATFORM CARD -->
            <template v-else-if="isAudio(file)">
              <div class="music-album-wrapper">
                <div class="music-vinyl-disc">
                  <i class="ph ph-music-notes"></i>
                </div>
                <div class="music-album-art">
                  <i class="ph ph-vinyl-record"></i>
                  <div class="music-play-overlay">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div class="file-main">
                <strong :title="fileName(file.key)" v-html="highlightText(fileName(file.key))"></strong>
                <span>无损音频 · {{ formatDate(file.uploaded) }}</span>
              </div>
              <footer class="file-footer">
                <span>大小</span><strong>{{ formatSize(file.size) }}</strong>
              </footer>
              <button class="more-button" type="button" title="更多操作" @click.stop="openContext(file, $event)"><i class="ph ph-dots-three-outline"></i></button>
            </template>

            <!-- 4. PROFESSIONAL SOFTWARE WATERFALL / GRID SHOWCASE CARD -->
            <template v-else-if="isSoftware(file)">
              <div class="software-card-body" @click.stop="openStudioSoftwareDetail(file)">
                <div class="software-card-top">
                  <div class="software-app-icon" :style="{ background: getAppThemeColor(file) }">
                    <i class="ph" :class="getAppIconClass(file)"></i>
                  </div>
                  <div class="software-title-col">
                    <div class="software-title-row">
                      <strong class="software-title" :title="getAppTitle(file)" v-html="highlightText(getAppTitle(file))"></strong>
                      <span class="software-ver-badge">{{ getAppVersion(file) }}</span>
                    </div>
                    <div class="software-platform-row">
                      <span class="platform-chip" :class="getPlatformClass(file)">{{ getAppPlatform(file) }}</span>
                      <span class="software-cat-tag">{{ getAppCategoryName(file) }}</span>
                    </div>
                  </div>
                </div>

                <p class="software-summary-line">{{ getAppSummary(file) }}</p>

                <!-- Key Features -->
                <div v-if="getAppFeatures(file).length" class="software-feature-tags">
                  <span v-for="(feat, fIdx) in getAppFeatures(file).slice(0, 2)" :key="fIdx" class="feature-tag">
                    <i class="ph ph-check-circle-fill"></i> {{ feat }}
                  </span>
                </div>

                <!-- Software Card Action Footer -->
                <div class="software-card-footer" @click.stop>
                  <span class="software-size-info">{{ formatSize(file.size) }}</span>
                  <div class="software-btn-group">
                    <button class="software-btn-detail" type="button" title="检视完整软件详情与安装指令" @click="openStudioSoftwareDetail(file)">
                      <i class="ph ph-info"></i>
                      <span>详情</span>
                    </button>
                    <button class="software-btn-get" type="button" title="获取多渠道极速下载链接" @click="openStudioSoftwareLinks(file)">
                      <i class="ph ph-arrow-circle-down-bold"></i>
                      <span>获取</span>
                    </button>
                    <button class="more-button" type="button" title="更多操作" @click.stop="openContext(file, $event)">
                      <i class="ph ph-dots-three-outline"></i>
                    </button>
                  </div>
                </div>
              </div>
            </template>

            <!-- 5. GENERAL ARCHIVE & DOCUMENT CARD -->
            <template v-else>
              <div v-if="isArchive(file)" class="archive-card-icon">
                <i class="ph ph-package"></i>
                <span class="archive-pill">{{ archiveExt(file) }}</span>
              </div>
              <MimeIcon v-else :content-type="file.httpMetadata?.contentType || ''" :thumbnail="file.customMetadata?.thumbnail ? `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png?storage=${encodeURIComponent(storageId)}` : null" :size="40" />
              <div class="file-main">
                <strong :title="fileName(file.key)" v-html="highlightText(fileName(file.key))"></strong>
                <span>{{ formatDate(file.uploaded) }}</span>
              </div>
              <footer class="file-footer">
                <span>大小</span><strong>{{ formatSize(file.size) }}</strong>
              </footer>
              <button class="more-button" type="button" title="更多操作" @click.stop="openContext(file, $event)"><i class="ph ph-dots-three-outline"></i></button>
            </template>
          </article>
        </section>
      </section>

      <!-- Floating Glassmorphism Upload Action Pill -->
      <button class="upload-button" type="button" title="上传或新建" @click="openUploadWithAuth">
        <i class="ph ph-plus-bold"></i>
        <span>新建或上传</span>
      </button>
    </main>
  </div>

  <!-- Global Universal Modals (Active in both macOS & Studio Modes) -->
  <Transition name="fade">
    <div v-if="isDragging" class="drag-overlay" @drop.prevent="onDrop">
      <div class="drag-content">
        <div class="drag-icon"><i class="ph ph-cloud-arrow-up"></i></div>
        <h3>释放鼠标立即上传</h3>
        <p>文件将保存至「{{ currentFolderName }}」</p>
      </div>
    </div>
  </Transition>

  <UploadProgress v-if="uploadProgress !== null" :progress="uploadProgress" :file-name="uploadFileName" :queue-count="uploadQueue.length" :speed-text="speedText" />
  <UploadPopup v-model="showUploadPopup" @upload="onUploadClicked" @upload-software="handleSoftwareUpload" @createFolder="createFolder" />
  <ContextMenu :visible="showContextMenu" :x="contextPosition.x" :y="contextPosition.y" :title="contextTitle" :actions="contextActions" @close="closeContext" @select="runContextAction" />
  <LightboxModal v-if="uiMode !== 'macos'" :visible="lightbox.visible" :items="imageItems" :index="lightbox.index" @close="lightbox.visible = false" @change="lightbox.index = $event" />
  <MediaPlayerModal v-if="uiMode !== 'macos'" :visible="mediaPlayer.visible" :items="mediaItems" :index="mediaPlayer.index" @close="mediaPlayer.visible = false" @change="mediaPlayer.index = $event" />
  <ArchiveModal :visible="archiveModal.visible" :file="archiveModal.file" @close="archiveModal.visible = false" />
  <HotkeysModal :visible="showHotkeysModal" @close="showHotkeysModal = false" />
  <ShareModal :visible="shareModal.visible" :file="shareModal.file" :raw-url="shareModal.rawUrl" @close="shareModal.visible = false" />
  <TextEditorModal :visible="textEditor.visible" :file="textEditor.file" :storage-headers="storageHeaders" @close="textEditor.visible = false" @saved="fetchFiles(true)" />
  <FileInspectorModal :visible="inspector.visible" :file="inspector.file" :storage-id="storageId" @close="inspector.visible = false" @action="handleInspectorAction" />
  <DocumentViewerModal :visible="docViewer.visible" :file="docViewer.file" :storage-id="storageId" @close="docViewer.visible = false" />
  <PromptDialog v-model="dialog.visible" :mode="dialog.mode" :title="dialog.title" :message="dialog.message" :initial-value="dialog.initialValue" :confirm-text="dialog.confirmText" :error="dialog.error" @submit="onDialogSubmit" />

  <!-- 🏛️ Studio Mode: Software App Detail Showcase Modal -->
  <Transition name="fade-slide">
    <div v-if="studioAppDetail" class="studio-detail-overlay" @click.self="studioAppDetail = null">
      <div class="studio-detail-card">
        <header class="detail-hero-banner">
          <button class="detail-close-btn" type="button" @click="studioAppDetail = null">×</button>
          <div class="detail-hero-app-info">
            <div class="detail-app-icon" :style="{ background: getAppThemeColor(studioAppDetail) }">
              <i class="ph" :class="getAppIconClass(studioAppDetail)"></i>
            </div>
            <div class="detail-app-meta">
              <div class="detail-title-badge-row">
                <h2>{{ getAppTitle(studioAppDetail) }}</h2>
                <span class="detail-ver-badge">{{ getAppVersion(studioAppDetail) }}</span>
                <span class="detail-verified-badge"><i class="ph ph-seal-check-fill"></i> 官方原版</span>
              </div>
              <p class="detail-summary">{{ getAppSummary(studioAppDetail) }}</p>
              <div class="detail-chips-row">
                <span class="detail-chip chip-platform">{{ getAppPlatform(studioAppDetail) }}</span>
                <span class="detail-chip chip-category">{{ getAppCategoryName(studioAppDetail) }}</span>
                <span class="detail-chip chip-size">{{ formatSize(studioAppDetail.size) }}</span>
              </div>
            </div>
          </div>

          <div class="detail-header-actions">
            <button class="btn-get-primary" type="button" @click="openStudioSoftwareLinks(studioAppDetail)">
              <i class="ph ph-arrow-circle-down-bold"></i>
              <span>获取安装包</span>
            </button>
            <button class="btn-edit-secondary" type="button" @click="openStudioSoftwareEditor(studioAppDetail)">
              <i class="ph ph-pencil-simple-bold"></i>
              <span>编辑简介</span>
            </button>
          </div>
        </header>

        <div class="detail-card-body">
          <!-- 1. 核心功能亮点 -->
          <section v-if="getAppFeatures(studioAppDetail).length" class="detail-sec">
            <h4 class="sec-title"><i class="ph ph-sparkle-fill"></i> 核心功能亮点与特性</h4>
            <div class="features-checklist-grid">
              <div v-for="(feat, idx) in getAppFeatures(studioAppDetail)" :key="idx" class="feature-item">
                <i class="ph ph-check-circle-fill"></i>
                <span>{{ feat }}</span>
              </div>
            </div>
          </section>

          <!-- 2. 安装与激活备忘 / 终端免隔离指令 -->
          <section class="detail-sec">
            <div class="sec-title-row">
              <h4 class="sec-title"><i class="ph ph-terminal-window-fill"></i> 安装与激活指南 / 终端指令</h4>
              <button v-if="isMacSoftware(studioAppDetail)" class="copy-cmd-btn" type="button" @click="copyQuarantine(studioAppDetail)">
                <i class="ph ph-copy"></i>
                <span>复制 macOS 绕过隔离命令</span>
              </button>
            </div>
            <pre class="install-guide-box">{{ getAppInstallGuide(studioAppDetail) }}</pre>
          </section>

          <!-- 3. 技术参数与文件属性 -->
          <section class="detail-sec">
            <h4 class="sec-title"><i class="ph ph-info-fill"></i> 安装包属性与参数</h4>
            <div class="specs-grid">
              <div class="spec-cell">
                <span class="spec-label">文件名称</span>
                <span class="spec-val font-mono">{{ fileName(studioAppDetail.key) }}</span>
              </div>
              <div class="spec-cell">
                <span class="spec-label">安装包体积</span>
                <span class="spec-val font-mono">{{ formatSize(studioAppDetail.size) }}</span>
              </div>
              <div class="spec-cell">
                <span class="spec-label">适用架构</span>
                <span class="spec-val">{{ getAppPlatform(studioAppDetail) }}</span>
              </div>
              <div class="spec-cell">
                <span class="spec-label">最后更新</span>
                <span class="spec-val">{{ formatDate(studioAppDetail.uploaded) }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 🏛️ Studio Mode: Multi-Link Download Action Sheet Modal -->
  <Transition name="fade-slide">
    <div v-if="studioAppLinks" class="studio-links-overlay" @click.self="studioAppLinks = null">
      <div class="studio-links-card">
        <header class="links-header">
          <div class="links-header-info">
            <div class="links-app-icon" :style="{ background: getAppThemeColor(studioAppLinks) }">
              <i class="ph" :class="getAppIconClass(studioAppLinks)"></i>
            </div>
            <div>
              <h3>获取「{{ getAppTitle(studioAppLinks) }}」</h3>
              <p>{{ getAppPlatform(studioAppLinks) }} · {{ formatSize(studioAppLinks.size) }}</p>
            </div>
          </div>
          <button class="links-close-btn" type="button" @click="studioAppLinks = null">×</button>
        </header>

        <div class="links-list">
          <!-- 1. Direct Browser Download -->
          <a :href="rawPath(studioAppLinks.key)" :download="fileName(studioAppLinks.key)" class="link-option-row primary-row" @click="studioAppLinks = null">
            <div class="opt-icon"><i class="ph ph-arrow-circle-down-bold"></i></div>
            <div class="opt-info">
              <strong>🚀 本地极速直接下载 (推荐)</strong>
              <span>通过 Cloudflare 全球边缘 CDN 极速下载原包体</span>
            </div>
            <span class="opt-badge">立即下载</span>
          </a>

          <!-- 2. Copy Raw R2 Direct Link -->
          <button class="link-option-row" type="button" @click="copyText(fullDirectUrl(studioAppLinks.key), '原生极速直链已复制！')">
            <div class="opt-icon"><i class="ph ph-link-simple-bold"></i></div>
            <div class="opt-info">
              <strong>🔗 复制 Cloudflare R2 原生直链</strong>
              <span>可粘贴至迅雷、IDM、Downie 或浏览器多线程下载</span>
            </div>
            <span class="opt-pill">复制直链</span>
          </button>

          <!-- 3. Copy Share Link -->
          <button class="link-option-row" type="button" @click="copyText(fullShareUrl(studioAppLinks.key), '网盘分享链接已复制！')">
            <div class="opt-icon"><i class="ph ph-share-network-bold"></i></div>
            <div class="opt-info">
              <strong>🌐 复制网盘分享/浏览页面链接</strong>
              <span>发送给好友或在多设备之间共享该安装包</span>
            </div>
            <span class="opt-pill">复制分享</span>
          </button>

          <!-- 4. Terminal cURL Command -->
          <button class="link-option-row" type="button" @click="copyText(curlCommand(studioAppLinks), '终端 cURL 下载指令已复制！')">
            <div class="opt-icon"><i class="ph ph-terminal-window-bold"></i></div>
            <div class="opt-info">
              <strong>💻 复制终端一键下载命令 (cURL / Wget)</strong>
              <span>在 macOS Terminal / Linux / PowerShell 中秒级拉取</span>
            </div>
            <span class="opt-pill">复制指令</span>
          </button>

          <!-- 5. Mobile QR Code -->
          <div class="mobile-qr-row">
            <img :src="qrCodeUrl(studioAppLinks.key)" alt="扫码下载" class="qr-img" />
            <div class="qr-info">
              <strong>📱 手机扫码直连极速下载</strong>
              <p>使用手机相机或扫一扫，即可直接在移动端下载并安装原文件。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 🏛️ Studio Mode: App Metadata Editor Modal -->
  <Transition name="fade-slide">
    <div v-if="studioAppEditor" class="studio-editor-overlay" @click.self="studioAppEditor = null">
      <div class="studio-editor-card">
        <header class="editor-header">
          <h3><i class="ph ph-pencil-simple-fill"></i> 编辑软件信息与简介</h3>
          <button class="editor-close-btn" type="button" @click="studioAppEditor = null">×</button>
        </header>

        <form class="editor-form" @submit.prevent="saveStudioAppEditor">
          <div class="form-row form-row-2">
            <div class="form-group">
              <label>🏷️ 软件名称 (Title)</label>
              <input v-model="studioAppEditor.title" type="text" required placeholder="如 Final Cut Pro" />
            </div>
            <div class="form-group">
              <label>🔢 版本号 (Version)</label>
              <input v-model="studioAppEditor.version" type="text" required placeholder="如 v10.8.1" />
            </div>
          </div>

          <div class="form-row form-row-2">
            <div class="form-group">
              <label>🗂️ 所属分类 (Category)</label>
              <select v-model="studioAppEditor.category">
                <option value="design">🎨 设计创意</option>
                <option value="productivity">⚡ 效率办公</option>
                <option value="developer">💻 开发工具</option>
                <option value="utilities">🛠️ 系统工具</option>
                <option value="entertainment">🎬 影音娱乐</option>
                <option value="network">🌐 网络通讯</option>
                <option value="mobile">📱 移动专属</option>
              </select>
            </div>
            <div class="form-group">
              <label>💻 适用平台与架构 (Platform)</label>
              <select v-model="studioAppEditor.platform">
                <option value="Windows (x64)">🪟 Windows (x64)</option>
                <option value="Windows (ARM64)">🪟 Windows (ARM64)</option>
                <option value="macOS (Universal 通用)">🍎 macOS (Universal 通用)</option>
                <option value="macOS (Apple Silicon M系列)">🍎 macOS (Apple Silicon M系列)</option>
                <option value="macOS (Intel x86_64)">🍎 macOS (Intel x86_64)</option>
                <option value="Android (APK)">📱 Android (APK)</option>
                <option value="iOS (IPA)">📱 iOS (IPA)</option>
                <option value="Linux (Deb / AppImage)">🐧 Linux (Deb / AppImage)</option>
                <option value="跨平台通用">🌐 跨平台通用</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>📝 一句话亮点简介 (Summary)</label>
            <input v-model="studioAppEditor.summary" type="text" placeholder="如 Apple 旗舰级非线性视频剪辑生产力神器" />
          </div>

          <div class="form-group">
            <label>🌟 核心功能亮点 (每行一条，换行分隔)</label>
            <textarea v-model="studioAppEditor.featuresText" rows="3" placeholder="支持 8K ProRes 实时剪辑&#10;全新 AI 智能对象跟踪&#10;极速硬件加速导出"></textarea>
          </div>

          <div class="form-group">
            <label>🔑 安装与激活指南 / 终端指令 / 备忘</label>
            <textarea v-model="studioAppEditor.installGuide" rows="4" placeholder="1. 打开 DMG 拖入 Applications&#10;2. 如提示损坏请在终端运行: sudo xattr -rd com.apple.quarantine /Applications/xxx.app"></textarea>
          </div>

          <div class="editor-btn-row">
            <button class="btn-cancel" type="button" @click="studioAppEditor = null">取消</button>
            <button class="btn-save" type="submit">
              <i class="ph ph-floppy-disk-bold"></i>
              <span>保存并同步到云端</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<script>
import { generateThumbnail, blobDigest, multipartUpload, MULTIPART_THRESHOLD } from "/assets/main.mjs";
import Menu from "./Menu.vue";
import MimeIcon from "./MimeIcon.vue";
import UploadPopup from "./UploadPopup.vue";
import UploadProgress from "./UploadProgress.vue";
import ContextMenu from "./ContextMenu.vue";
import PromptDialog from "./PromptDialog.vue";
import LightboxModal from "./LightboxModal.vue";
import MediaPlayerModal from "./MediaPlayerModal.vue?v=13.0";
import ArchiveModal from "./ArchiveModal.vue";
import HotkeysModal from "./HotkeysModal.vue";
import CatLogo from "./CatLogo.vue";
import ShareModal from "./ShareModal.vue";
import TextEditorModal from "./TextEditorModal.vue";
import FileInspectorModal from "./FileInspectorModal.vue";
import DocumentViewerModal from "./DocumentViewerModal.vue";
import MacDesktop from "./MacDesktop.vue";
import MacAppStoreModal from "./MacAppStoreModal.vue";

const PRESET_APP_DB = [
  { match: ["studioone", "studio one", "studio_one"], title: "PreSonus Studio One Pro", category: "entertainment", appName: "Studio One.app", summary: "专业级全能音乐创作、录音混音与母带制作宿主工作站 (DAW)。", features: ["原生 64 位双精度音频引擎", "极速拖拽编曲工作流", "内置海量母带级别 DSP 效果器"] },
  { match: ["fl studio", "flstudio", "fruity"], title: "FL Studio Producer", category: "entertainment", appName: "FL Studio.app", summary: "全球电子音乐人与编曲制作人首选的全功能音乐制作环境。", features: ["经典步进音序器与钢琴卷帘", "矢量全动态缩放界面", "终身免费升级官方音色库"] },
  { match: ["cubase"], title: "Steinberg Cubase Pro", category: "entertainment", appName: "Cubase.app", summary: "影视配乐与流行音乐工业级标准数字音频工作站。", features: ["VariAudio 人声精准音高修正", "MixConsole 模拟调音台通道条", "支持 Dolby Atmos 全景声混音"] },
  { match: ["photoshop", "ps"], title: "Adobe Photoshop", category: "design", appName: "Adobe Photoshop 2024.app", summary: "全球行业标准的图像处理、合成与创意设计生产力旗舰软件。", features: ["生成式 AI 智能填充", "无损高保真图像合成", "RAW 格式全色彩深度调优"] },
  { match: ["premiere", "pr"], title: "Adobe Premiere Pro", category: "entertainment", appName: "Adobe Premiere Pro 2024.app", summary: "专业非线性视频编辑与电影级调色套件。", features: ["原生 8K ProRes 极速剪辑", "AI 自动文字转语音字幕", "Lumetri 电影级色彩调校"] },
  { match: ["after effects", "ae"], title: "Adobe After Effects", category: "design", appName: "Adobe After Effects 2024.app", summary: "电影级视觉特效制作与动态图形设计工作站。", features: ["3D 动态图形合成引擎", "精准 Roto 抠像与追踪", "电影级粒子与光效插件兼容"] },
  { match: ["illustrator", "ai"], title: "Adobe Illustrator", category: "design", appName: "Adobe Illustrator 2024.app", summary: "行业标准矢量插画、图标与品牌视觉设计利器。", features: ["无损矢量排版与排版设计", "生成式矢量绘图引擎", "精准几何图形构筑工具"] },
  { match: ["final cut", "fcp"], title: "Final Cut Pro", category: "entertainment", appName: "Final Cut Pro.app", summary: "Apple 专为 Mac 硬件深度优化的专业非线性剪辑神器。", features: ["Metal 硬件加速秒速渲染", "磁性时间线流线型剪辑", "智能面部与对象自动追踪"] },
  { match: ["logic pro"], title: "Logic Pro", category: "entertainment", appName: "Logic Pro.app", summary: "Apple 专业级音乐创作、录音、音效设计与母带处理工作站。", features: ["数千款高品质合成器音源", "空间音频杜比全景声混音", "实时打击乐伴奏生成器"] },
  { match: ["cleanmymac"], title: "CleanMyMac X", category: "utilities", appName: "CleanMyMac X.app", summary: "macOS 经典的全能系统深度清理、安全防护与性能提速管家。", features: ["一键全盘垃圾与系统缓存扫描", "恶意软件实时查杀拦截", "深度卸载与残留文件彻底粉碎"] },
  { match: ["snipaste", "pixpin"], title: "Snipaste 截图利器", category: "utilities", appName: "Snipaste.app", summary: "极其强大便捷的屏幕截图、贴图与取色标注神器。", features: ["像素级精准智能边缘吸附", "截图置顶贴图与透明度调节", "高级取色与标注工具箱"] },
  { match: ["bandizip", "7-zip", "7zip"], title: "Bandizip 全能压缩", category: "utilities", appName: "Bandizip.app", summary: "轻巧极速、支持全格式解压与多核心极速压缩的必备工具。", features: ["多核 CPU 满速并行压缩", "免解压直接预览图片文档", "支持长文件名与全字符集"] },
  { match: ["vscode", "visual studio code"], title: "Visual Studio Code", category: "developer", appName: "Visual Studio Code.app", summary: "微软轻量级、跨平台且生态极度丰富的现代化代码编辑器。", features: ["海量插件与主题生态支持", "内置 Git 版本控制与终端", "智能代码提示与调试器集成"] },
  { match: ["intellij", "idea"], title: "IntelliJ IDEA Ultimate", category: "developer", appName: "IntelliJ IDEA.app", summary: "Java / Kotlin 业界天花板级企业应用开发集成环境。", features: ["深度智能代码分析与重构", "全栈框架与数据库工具集成", "AI 编程助手深度嵌入"] },
  { match: ["pycharm"], title: "PyCharm Professional", category: "developer", appName: "PyCharm.app", summary: "Python 专业开发者首选的全栈开发与数据科学 IDE。", features: ["Django / Flask 框架深度支持", "科学计算与 Jupyter 交互", "远程容器与 SSH 部署环境"] },
  { match: ["webstorm"], title: "WebStorm", category: "developer", appName: "WebStorm.app", summary: "专为 JavaScript / TypeScript / Vue / React 生态打造的最聪明的前端 IDE。", features: ["前端全套框架深度智能提示", "CSS / Sass / Tailwind 实时校验", "强大的重构与单元测试工具"] },
  { match: ["tableplus"], title: "TablePlus", category: "developer", appName: "TablePlus.app", summary: "轻量、极速且颜值爆表的原生关系型数据库管理客户端。", features: ["支持 MySQL/PostgreSQL/Redis/SQLite", "内联编辑与多标签页管理", "端到端 SSH 隧道加密连接"] },
  { match: ["navicat"], title: "Navicat Premium", category: "developer", appName: "Navicat Premium.app", summary: "企业级多连接数据库管理与数据迁移建模套件。", features: ["可视化数据模型设计器", "跨库结构与数据实时同步", "自动化定时备份与脚本执行"] },
  { match: ["docker"], title: "Docker Desktop", category: "developer", appName: "Docker.app", summary: "容器化应用构建、分发与本地运行的一体化桌面工作流。", features: ["一键启动 Kubernetes 环境", "多架构镜像跨平台编译", "低功耗虚拟化后台引擎"] },
  { match: ["notion"], title: "Notion", category: "productivity", appName: "Notion.app", summary: "All-in-one 知识库、项目管理与协作笔记神器。", features: ["自由无限制的 Block 模块化排版", "强大的 Database 多视图联动", "Notion AI 智能写作辅助"] },
  { match: ["obsidian"], title: "Obsidian", category: "productivity", appName: "Obsidian.app", summary: "本地离线优先、基于 Markdown 双向链接的第二大脑知识库。", features: ["无缝构建个人网状知识图谱", "数千款社区插件与主题拓展", "数据纯本地保存，隐私绝对自主"] },
  { match: ["typora"], title: "Typora", category: "productivity", appName: "Typora.app", summary: "极简纯粹、所见即所得的顶级 Markdown 写作体验利器。", features: ["输入即渲染，去除繁琐分屏", "支持数学公式与 Mermaid 图表", "丰富的高颜值 PDF / HTML 导出主题"] },
  { match: ["iina", "potplayer"], title: "IINA 全能播放器", category: "entertainment", appName: "IINA.app", summary: "现代化全能影音播放器，基于 mpv 内核，支持全格式硬解。", features: ["4K HDR 与杜比视界高保真回放", "原生毛玻璃与画中画模式", "支持在线字幕自动精准匹配"] },
  { match: ["downie"], title: "Downie 4", category: "utilities", appName: "Downie 4.app", summary: "macOS 最好用的全网高清音视频一键解析下载器。", features: ["支持全球数千个主流视频网站", "一键拖拽直链与批量抓取", "最高支持 4K/8K 与 HDR 原画下载"] },
  { match: ["permute"], title: "Permute 3", category: "utilities", appName: "Permute 3.app", summary: "精美优雅且极速的音视频/图片格式转换神器。", features: ["多核心硬件加速极速转码", "批量压制与体积大幅瘦身", "音视频一键拼接与提取伴奏"] },
  { match: ["clash", "clash verge"], title: "Clash Verge Rev", category: "network", appName: "Clash Verge.app", summary: "基于 Tauri 架构的高颜值全能网络代理工具与分流调度中心。", features: ["支持 Meta / Mihomo 新内核", "强大的规则订阅与自定义分流", "全平台统一极简毛玻璃界面"] },
  { match: ["surge"], title: "Surge for Mac", category: "network", appName: "Surge.app", summary: "macOS 上最强大的高级网络调试、抓包与流量接管工具。", features: ["精准分流与本地 DNS 高性能优化", "全协议请求实时解密抓包分析", "支持网关接管全屋局域网流量"] },
  { match: ["raycast"], title: "Raycast", category: "productivity", appName: "Raycast.app", summary: "新一代键盘驱动的极速 macOS 效率启动台与工作流中心。", features: ["海量插件生态秒级唤醒操作", "内置剪贴板历史与快捷短语", "深度集成 AI 交互与系统设置"] },
  { match: ["betterdisplay"], title: "BetterDisplay", category: "utilities", appName: "BetterDisplay.app", summary: "外接显示器 HiDPI 渲染与屏幕亮度精准调节神器。", features: ["一键解锁外接屏最佳 HiDPI 分辨率", "键盘原生亮度与音量 DDC 控制", "支持画中画与自定义色域映射"] },
];

function detectPlatform(key) {
  const lower = (key || "").toLowerCase();
  if (lower.endsWith(".dmg") || lower.endsWith(".pkg")) {
    if (lower.includes("arm64") || lower.includes("m1") || lower.includes("m2") || lower.includes("m3") || lower.includes("m4") || lower.includes("apple_silicon")) {
      return "macOS (Apple Silicon M系列)";
    } else if (lower.includes("intel") || lower.includes("x64") || lower.includes("x86_64")) {
      return "macOS (Intel x86_64)";
    }
    return "macOS (Universal 通用)";
  }
  if (lower.endsWith(".exe") || lower.endsWith(".msi") || lower.includes("win_") || lower.includes("windows")) {
    return lower.includes("arm") ? "Windows (ARM64)" : "Windows (x64)";
  }
  if (lower.endsWith(".apk")) return "Android (APK)";
  if (lower.endsWith(".ipa")) return "iOS (IPA)";
  if (lower.endsWith(".deb") || lower.endsWith(".appimage") || lower.endsWith(".rpm")) return "Linux (Deb / AppImage)";
  return "跨平台通用";
}

function getAppMetadata(metadata, fileKey) {
  if (!metadata || typeof metadata !== "object" || !fileKey) return {};
  if (metadata[fileKey]) return metadata[fileKey];
  const withPrefix = fileKey.startsWith("软件/") ? fileKey : `软件/${fileKey}`;
  if (metadata[withPrefix]) return metadata[withPrefix];
  const withoutPrefix = fileKey.replace(/^软件\//, "");
  if (metadata[withoutPrefix]) return metadata[withoutPrefix];
  const fileName = fileKey.split("/").pop();
  if (fileName && metadata[fileName]) return metadata[fileName];
  for (const [k, v] of Object.entries(metadata)) {
    if (k.split("/").pop() === fileName) return v;
  }
  return {};
}

function parseDefaultMeta(file) {
  const key = (typeof file === "string" ? file : file?.key) || "";
  let baseName = key.split("/").pop() || key;
  baseName = baseName.replace(/\.[a-zA-Z0-9_\.]*$/, "");

  let version = "1.0.0";
  const verMatch = baseName.match(/[vV]?(\d+\.\d+(\.\d+)?)/);
  if (verMatch) version = `v${verMatch[1]}`;

  const lowerName = baseName.toLowerCase();
  const matched = PRESET_APP_DB.find(p => p.match.some(m => lowerName.includes(m)));
  const platform = detectPlatform(key);
  let appName = matched ? matched.appName : `${baseName}.app`;

  let title = matched ? matched.title : baseName
    .replace(/[vV]?\d+\.\d+(\.\d+)?.*$/, "")
    .replace(/[_\-]+(mac|macos|win|windows|x64|arm64|universal|crack|patch|setup|installer)/gi, " ")
    .replace(/[_\-\.]+/g, " ")
    .trim();

  if (!title) title = baseName;
  let category = matched ? matched.category : "utilities";
  let summary = matched ? matched.summary : `${title} 官方完整安装包，直连高速下载。`;
  let features = matched ? matched.features : ["极速云端直连下载", "经过完整兼容性校验", "支持断点续传"];

  let installGuide = "";
  if (platform.includes("macOS")) {
    installGuide = `1. 双击打开 DMG 镜像包；\n2. 将【${title}】拖入 Applications 应用程序文件夹；\n3. 若打开提示「文件已损坏」或无法打开，请在终端输入并回车：\nsudo xattr -rd com.apple.quarantine /Applications/${appName.replace(/\s/g, "\\ ")}`;
  } else if (platform.includes("Windows")) {
    installGuide = `1. 双击运行安装程序；\n2. 按照屏幕提示完成安装向导。`;
  } else {
    installGuide = `1. 手机端直接扫码或下载原安装包；\n2. 授权安装未知来源应用即可畅快体验。`;
  }

  return { title, version, category, platform, summary, features, installGuide, appName };
}

function loadAuthCredentials() {
  try {
    const saved = localStorage.getItem("drive-auth") || sessionStorage.getItem("drive-auth");
    return JSON.parse(saved || "null");
  } catch {
    return null;
  }
}

export default {
  data: () => ({
    uiMode: localStorage.getItem("ui-mode") || "macos",
    cwd: new URL(window.location).searchParams.get("p") || "",
    storageId: new URL(window.location).searchParams.get("storage") || "default",
    storageOptions: [{ id: "default", label: "主存储" }],
    theme: localStorage.getItem("drive-theme") || "dark",
    files: [],
    folders: [],
    globalFiles: [],
    globalFilesLoaded: false,
    autoGlobalScan: true,
    filterCategory: "all",
    appsMetadata: {},
    clipboard: null,
    focusedItem: null,
    contextPosition: { x: 0, y: 0 },
    loading: false,
    order: "name-asc",
    search: "",
    showSearchInput: false,
    viewMode: localStorage.getItem("drive-view") || "grid",
    showContextMenu: false,
    showMenu: false,
    showUploadPopup: false,
    uploadProgress: null,
    uploadFileName: "",
    speedText: "",
    uploadQueue: [],
    isUploading: false,
    isDragging: false,
    lightbox: { visible: false, index: 0 },
    mediaPlayer: { visible: false, index: 0 },
    archiveModal: { visible: false, file: null },
    textEditor: { visible: false, file: null },
    inspector: { visible: false, file: null },
    docViewer: { visible: false, file: null },
    showHotkeysModal: false,
    shareModal: { visible: false, file: null, rawUrl: "" },
    authCredentials: loadAuthCredentials(),
    pendingUploadTargetFolder: null,
    dialog: { visible: false, mode: "input", title: "", message: "", initialValue: "", confirmText: "确定", error: "" },
    dialogAction: null,
    studioSoftwarePlatform: "all",
    studioSoftwareSubCat: "all",
    studioAppDetail: null,
    studioAppLinks: null,
    studioAppEditor: null,
  }),
  computed: {
    menuItems() {
      return [
        { text: this.uiMode === "macos" ? "切换为经典展厅模式" : "切换为 macOS 桌面模式", value: "toggle-ui-mode" },
        { text: "按名称排序", value: "name-asc" },
        { text: "按大小从小到大", value: "size-asc" },
        { text: "按大小从大到小", value: "size-desc" },
        { text: "粘贴项目", value: "paste", disabled: !this.clipboard },
        { text: this.theme === "dark" ? "切换为浅色模式" : "切换为暗色模式", value: "toggle-theme" },
        { text: "退出登录", value: "logout" }
      ];
    },
    contextTitle() { if (!this.focusedItem) return this.storageOptions.find((item) => item.id === this.storageId)?.label || "文件库"; return typeof this.focusedItem === "string" ? this.folderName(this.focusedItem) : this.fileName(this.focusedItem.key); },
    contextActions() {
      if (!this.focusedItem) return [
        { id: "upload", label: "上传文件 (Upload)", icon: "ph-upload-simple" },
        { id: "create-folder", label: "新建文件夹 (New Folder)", icon: "ph-folder-plus" },
        { id: "refresh", label: "刷新访达 (Reload)", icon: "ph-arrows-clockwise" },
        { id: "paste", label: "粘贴项目", icon: "ph-clipboard", disabled: !this.clipboard },
        { id: "logout", label: "退出登录", icon: "ph-sign-out", danger: true }
      ];
      if (typeof this.focusedItem === "string") return [
        { id: "open", label: "打开文件夹", icon: "ph-folder-open" },
        { id: "copy-link", label: "复制链接", icon: "ph-link" },
        { id: "copy-item", label: "复制文件夹", icon: "ph-copy" },
        { id: "cut-item", label: "剪切文件夹", icon: "ph-scissors" },
        { id: "move", label: "移动到...", icon: "ph-arrows-out-cardinal" },
        { id: "delete", label: "删除文件夹", icon: "ph-trash", danger: true }
      ];
      const isEdit = this.focusedItem && this.isEditable(this.focusedItem);
      const isImg = this.focusedItem && this.isImage(this.focusedItem);
      const isSoft = this.focusedItem && this.isSoftware(this.focusedItem);
      const isMacApp = isSoft && (this.focusedItem.key?.endsWith(".dmg") || this.focusedItem.key?.endsWith(".pkg") || this.focusedItem.key?.toLowerCase().includes("mac"));
      return [
        { id: "preview", label: isSoft ? "查看软件详情与指令" : "查看/播放 (Space)", icon: isSoft ? "ph-app-store-logo" : "ph-eye" },
        ...(isSoft ? [
          { id: "app-get-links", label: "获取下载链接与指令", icon: "ph-link-simple" },
          { id: "app-edit-meta", label: "编辑软件简介与说明", icon: "ph-pencil-simple" }
        ] : []),
        ...(isMacApp ? [{ id: "copy-quarantine-cmd", label: "复制终端免隔离命令", icon: "ph-terminal-window" }] : []),
        ...(isImg ? [{ id: "set-wallpaper", label: "设置为桌面壁纸", icon: "ph-image" }] : []),
        { id: "inspect", label: "查看属性 (I)", icon: "ph-info" },
        ...(isEdit ? [{ id: "edit", label: "在线编辑", icon: "ph-code" }] : []),
        { id: "download", label: "下载原文件", icon: "ph-download-simple" },
        { id: "share", label: "分享与二维码", icon: "ph-share-network" },
        { id: "copy-link", label: "复制直链", icon: "ph-link" },
        { id: "copy-item", label: "复制文件", icon: "ph-copy" },
        { id: "cut-item", label: "剪切文件", icon: "ph-scissors" },
        { id: "rename", label: "重命名", icon: "ph-pencil-simple" },
        { id: "move", label: "移动到...", icon: "ph-arrows-out-cardinal" },
        { id: "delete", label: "删除文件", icon: "ph-trash", danger: true }
      ];
    },
    pathParts() { return this.cwd.split("/").filter(Boolean); },
    parentPath() {
      const clean = this.cwd.endsWith("/") ? this.cwd.slice(0, -1) : this.cwd;
      const lastSlash = clean.lastIndexOf("/");
      return lastSlash >= 0 ? clean.slice(0, lastSlash + 1) : "";
    },
    currentFolderName() { return this.pathParts.at(-1) || "资源总览"; },
    itemCountText() { const count = this.filteredFiles.length + this.filteredFolders.length; return `${count} 个资源项目${this.search ? " · 搜索结果" : ""}`; },
    totalItemCount() { return this.files.length + this.folders.length; },
    
    categoryMeta() {
      const map = {
        all: { title: "个人云端 Showcase 展厅", desc: "直连存储 · 在线影音播放 · 归档解压预览 · 全速传输" },
        image: { title: "🖼️ 瀑布流高清照片图库", desc: "Pinterest 级高保真瀑布流展厅 · 点击开启沉浸式幻灯片" },
        video: { title: "🎬 4K 影音与视频画廊", desc: "B 站 / 影院级 16:9 画幅画廊 · 专属浮动控件与高保真流媒体" },
        audio: { title: "🎵 3D 黑胶无损唱片曲库", desc: "Apple Music 级 3D 唱片滑出视效 · 动态频谱与在线高保真音频" },
        software: { title: "💻 专业软件与生产力工坊", desc: "跨平台多架构应用集市 · 极速直连秒下 · 一键复制安装备忘与免隔离指令" },
        archive: { title: "📦 压缩包与归档资源", desc: "跨目录全盘自动归类 · 支持在线解压检视 ZIP/RAR 目录树" },
        document: { title: "📄 文档与办公资料", desc: "跨目录全盘自动归类 · PDF / Word / Markdown / 电子书" },
      };
      return map[this.filterCategory] || map.all;
    },

    allBucketFiles() {
      const map = new Map();
      for (const f of this.files) {
        if (f && f.key) map.set(f.key, f);
      }
      if (this.globalFilesLoaded) {
        for (const f of this.globalFiles) {
          if (f && f.key) map.set(f.key, f);
        }
      }
      return Array.from(map.values());
    },

    sourceFileList() {
      if (this.filterCategory === "all") return this.files;
      const map = new Map();
      for (const f of this.files) {
        if (f && f.key) map.set(f.key, f);
      }
      if (this.autoGlobalScan && this.globalFilesLoaded) {
        for (const f of this.globalFiles) {
          if (f && f.key) map.set(f.key, f);
        }
      }
      return Array.from(map.values());
    },

    totalStorageBytes() {
      const map = new Map();
      for (const f of this.files) {
        if (f && f.key && f.size) map.set(f.key, f.size);
      }
      if (this.globalFilesLoaded) {
        for (const f of this.globalFiles) {
          if (f && f.key && f.size) map.set(f.key, f.size);
        }
      }
      let total = 0;
      for (const size of map.values()) total += size;
      return total;
    },

    categoryBytes() {
      const map = new Map();
      for (const f of this.files) {
        if (f && f.key) map.set(f.key, f);
      }
      if (this.globalFilesLoaded) {
        for (const f of this.globalFiles) {
          if (f && f.key) map.set(f.key, f);
        }
      }
      const bytes = { image: 0, video: 0, audio: 0, software: 0, archive: 0, document: 0 };
      for (const f of map.values()) {
        const s = f.size || 0;
        if (this.isImage(f)) bytes.image += s;
        else if (this.isVideo(f)) bytes.video += s;
        else if (this.isAudio(f)) bytes.audio += s;
        else if (this.isSoftware(f)) bytes.software += s;
        else if (this.isArchive(f)) bytes.archive += s;
        else if (this.isDocument(f)) bytes.document += s;
      }
      return bytes;
    },

    storagePercent() {
      const cap = 10 * 1024 * 1024 * 1024; // 10 GB
      const pct = (this.totalStorageBytes / cap) * 100;
      return Math.min(100, Math.max(1, pct));
    },

    studioSoftwareCounts() {
      const allSoft = this.sourceFileList.filter(this.isSoftware);
      const counts = { all: allSoft.length, mac: 0, win: 0, mobile: 0, linux: 0 };
      for (const f of allSoft) {
        const p = (this.getAppPlatform(f) || "").toLowerCase();
        if (p.includes("mac")) counts.mac++;
        else if (p.includes("win")) counts.win++;
        else if (p.includes("android") || p.includes("ios") || p.includes("apk") || p.includes("ipa")) counts.mobile++;
        else if (p.includes("linux") || p.includes("deb") || p.includes("appimage")) counts.linux++;
      }
      return counts;
    },

    filteredFiles() {
      const query = this.search.toLocaleLowerCase();
      return this.sourceFileList.filter((file) => {
        const nameMatch = !query || this.fileName(file.key).toLocaleLowerCase().includes(query) || (this.isSoftware(file) && (this.getAppTitle(file).toLocaleLowerCase().includes(query) || this.getAppSummary(file).toLocaleLowerCase().includes(query)));
        if (!nameMatch) return false;
        if (this.filterCategory === "image") return this.isImage(file);
        if (this.filterCategory === "video") return this.isVideo(file);
        if (this.filterCategory === "audio") return this.isAudio(file);
        if (this.filterCategory === "software" || this.filterCategory === "app") {
          if (!this.isSoftware(file)) return false;
          if (this.studioSoftwarePlatform !== "all") {
            const p = (this.getAppPlatform(file) || "").toLowerCase();
            if (this.studioSoftwarePlatform === "mac" && !p.includes("mac")) return false;
            if (this.studioSoftwarePlatform === "win" && !p.includes("win")) return false;
            if (this.studioSoftwarePlatform === "mobile" && !p.includes("android") && !p.includes("ios") && !p.includes("apk") && !p.includes("ipa")) return false;
            if (this.studioSoftwarePlatform === "linux" && !p.includes("linux") && !p.includes("deb") && !p.includes("appimage")) return false;
          }
          if (this.studioSoftwareSubCat !== "all") {
            const c = (this.getAppCategory(file) || "").toLowerCase();
            if (c !== this.studioSoftwareSubCat.toLowerCase()) return false;
          }
          return true;
        }
        if (this.filterCategory === "archive") return this.isArchive(file);
        if (this.filterCategory === "document") return this.isDocument(file);
        return true;
      });
    },

    filteredFolders() {
      const query = this.search.toLocaleLowerCase();
      if (this.filterCategory !== "all") return [];
      return this.folders.filter((folder) => !query || this.folderName(folder).toLocaleLowerCase().includes(query));
    },

    categoryCounts() {
      const map = new Map();
      for (const f of this.files) {
        if (f && f.key) map.set(f.key, f);
      }
      if (this.globalFilesLoaded) {
        for (const f of this.globalFiles) {
          if (f && f.key) map.set(f.key, f);
        }
      }
      const list = Array.from(map.values());
      const counts = { image: 0, video: 0, audio: 0, software: 0, archive: 0, document: 0 };
      for (const f of list) {
        if (this.isImage(f)) counts.image++;
        else if (this.isVideo(f)) counts.video++;
        else if (this.isAudio(f)) counts.audio++;
        else if (this.isSoftware(f)) counts.software++;
        else if (this.isArchive(f)) counts.archive++;
        else if (this.isDocument(f)) counts.document++;
      }
      return counts;
    },

    imageItems() { return this.filteredFiles.filter(this.isImage).map((f) => ({ name: this.fileName(f.key), url: this.rawPath(f.key), file: f })); },
    mediaItems() { return this.filteredFiles.filter(this.isMedia).map((f) => ({ name: this.fileName(f.key), url: this.rawPath(f.key), file: f })); },
  },
  methods: {
    onGlobalKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.showSearchInput = true;
        this.$nextTick(() => this.$refs.searchInputRef?.focus());
      } else if (e.key === "?" || (e.shiftKey && e.key === "?")) {
        const tag = document.activeElement?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          this.showHotkeysModal = true;
        }
      }
    },

    onSearchBlur() {
      if (!this.search) {
        this.showSearchInput = false;
      }
    },

    loadCachedGlobalIndex() {
      try {
        const cacheKey = `flaredrive_index_cache_${this.storageId}`;
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.items) && parsed.items.length) {
            this.globalFiles = parsed.items;
            this.globalFilesLoaded = true;
          }
        }
      } catch (err) {
        console.warn("Load index cache error", err);
      }
    },

    saveGlobalIndexCache() {
      try {
        const cacheKey = `flaredrive_index_cache_${this.storageId}`;
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), items: this.globalFiles }));
      } catch (err) {
        console.warn("Save index cache error", err);
      }
    },

    selectCategory(cat) {
      this.filterCategory = cat;
      this.mediaPlayer.visible = false;
      this.lightbox.visible = false;
      this.archiveModal.visible = false;
      if (cat !== "all" && this.autoGlobalScan && !this.globalFilesLoaded) {
        this.fetchGlobalFiles();
      }
    },

    onToggleGlobalScan() {
      if (this.autoGlobalScan && !this.globalFilesLoaded) {
        this.fetchGlobalFiles();
      }
    },

    async fetchGlobalFiles(silent = false) {
      try {
        const items = await this.getAllItems("");
        this.globalFiles = items.filter((item) => item.key && !item.key.endsWith("_$folder$"));
        this.globalFilesLoaded = true;
        this.saveGlobalIndexCache();
      } catch (err) {
        console.warn("Global scan failed", err);
      }
    },

    async getAllItems(prefix = "") {
      try {
        const cleanPrefix = prefix ? (prefix.endsWith("/") ? prefix : `${prefix}/`) : "";
        const response = await fetch(`/api/children/${cleanPrefix}`, { headers: this.storageHeaders() });
        if (!response.ok) return [];
        const data = await response.json();
        const items = [...(data.value || [])];
        for (const folder of data.folders || []) {
          items.push({ key: `${folder}_$folder$` });
          const subItems = await this.getAllItems(folder);
          items.push(...subItems);
        }
        return items;
      } catch (err) {
        console.warn("getAllItems failed for prefix:", prefix, err);
        return [];
      }
    },

    isImage(file) { const type = (file.httpMetadata?.contentType || "").toLowerCase(); if (type.startsWith("image/")) return true; return /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp|heic|ico)$/i.test(file.key || ""); },
    isVideo(file) { const type = (file.httpMetadata?.contentType || "").toLowerCase(); if (type.startsWith("video/")) return true; return /\.(mp4|webm|mkv|mov|m4v|avi|flv|wmv|3gp)$/i.test(file.key || ""); },
    isAudio(file) { const type = (file.httpMetadata?.contentType || "").toLowerCase(); if (type.startsWith("audio/")) return true; return /\.(mp3|wav|ogg|flac|m4a|aac|opus|wma|aiff|alac)$/i.test(file.key || ""); },
    isSoftware(file) {
      const key = (typeof file === "string" ? file : file?.key || "").toLowerCase();
      if (!key || key.endsWith("_$folder$")) return false;
      return /\.(dmg|pkg|exe|msi|apk|ipa|deb|appimage|rpm|iso)$/i.test(key) ||
        key.startsWith("软件/") ||
        (key.endsWith(".zip") && (key.includes("mac") || key.includes("win") || key.includes("app") || key.includes("软件") || key.includes("setup") || key.includes("install")));
    },
    isArchive(file) {
      if (this.isSoftware(file)) return false;
      const type = (file?.httpMetadata?.contentType || "").toLowerCase();
      if (type.includes("zip") || type.includes("rar") || type.includes("compressed") || type.includes("tar") || type.includes("archive")) return true;
      return /\.(zip|rar|7z|tar|gz|bz2|xz|iso|dmg|pkg|sql\.gz)$/i.test(file?.key || "");
    },
    isDocument(file) { const type = (file.httpMetadata?.contentType || "").toLowerCase(); if (type.includes("pdf") || type.includes("word") || type.includes("document") || type.includes("text")) return true; return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md|json|csv|epub)$/i.test(file.key || ""); },
    isEditable(file) { if (!file || !file.key) return false; return /\.(txt|md|markdown|json|js|ts|css|html|vue|py|sh|yaml|yml|sql|xml|env|ini|conf|log|properties)$/i.test(file.key); },
    isMedia(file) { return this.isVideo(file) || this.isAudio(file); },
    archiveExt(file) { const ext = (file.key || "").split(".").pop(); return ext ? ext.toUpperCase() : "ZIP"; },
    imageUrl(file) {
      if (this.isImage(file)) return this.rawPath(file.key);
      if (file.customMetadata?.thumbnail) return `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png?storage=${encodeURIComponent(this.storageId)}`;
      return this.rawPath(file.key);
    },
    openFile(file) {
      if (typeof file === "string") {
        const found = (this.autoGlobalScan ? this.sourceFileList : this.files).find((f) => f.key === file);
        if (found) file = found;
      }
      if (!file) return;
      if (this.uiMode === "macos" && this.$refs.macDesktopRef) {
        if (this.isImage(file) || this.isVideo(file) || this.isAudio(file) || this.isSoftware(file)) {
          this.$refs.macDesktopRef.handleOpenFile(file);
          return;
        }
      }
      if (this.isImage(file)) {
        const index = this.imageItems.findIndex((item) => item.file.key === file.key);
        if (index !== -1) {
          this.lightbox.index = index;
          this.lightbox.visible = true;
          return;
        }
      }
      if (this.isMedia(file)) {
        const index = this.mediaItems.findIndex((item) => item.file.key === file.key);
        if (index !== -1) {
          this.mediaPlayer.index = index;
          this.mediaPlayer.visible = true;
          return;
        }
      }
      if (this.isArchive(file)) {
        this.archiveModal.file = { ...file, name: this.fileName(file.key), url: this.rawPath(file.key), file };
        this.archiveModal.visible = true;
        return;
      }
      if (this.isSoftware(file)) {
        this.openStudioSoftwareDetail(file);
        return;
      }
      if (this.isDocViewer(file)) {
        this.docViewer = { visible: true, file };
        return;
      }
      if (this.isEditable(file)) {
        this.textEditor.file = file;
        this.textEditor.visible = true;
        return;
      }
      this.preview(this.rawPath(file.key));
    },

    getCategoryIcon(cat) {
      const map = {
        all: "ph-squares-four",
        image: "ph-image-fill",
        video: "ph-film-strip-fill",
        audio: "ph-music-notes-fill",
        software: "ph-app-store-logo-fill",
        archive: "ph-package-fill",
        document: "ph-file-text-fill",
      };
      return map[cat] || "ph-folder-fill";
    },

    getAppItem(file) {
      if (!file) return {};
      const custom = getAppMetadata(this.appsMetadata, file.key);
      const def = parseDefaultMeta(file);
      return {
        file,
        key: file.key,
        size: file.size || 0,
        uploaded: file.uploaded || "",
        title: custom.title || def.title,
        version: custom.version || def.version,
        category: custom.category || def.category,
        platform: custom.platform || def.platform,
        summary: custom.summary || def.summary,
        features: custom.features && custom.features.length ? custom.features : def.features,
        installGuide: custom.installGuide || def.installGuide,
        appName: def.appName,
      };
    },
    getAppTitle(file) { return this.getAppItem(file).title; },
    getAppVersion(file) { return this.getAppItem(file).version; },
    getAppPlatform(file) { return this.getAppItem(file).platform; },
    getAppCategory(file) { return this.getAppItem(file).category; },
    getAppCategoryName(file) {
      const cat = (this.getAppCategory(file) || "").toLowerCase();
      const map = {
        design: "🎨 设计创意",
        productivity: "⚡ 效率办公",
        developer: "💻 开发工具",
        utilities: "🛠️ 系统工具",
        entertainment: "🎬 影音娱乐",
        network: "🌐 网络通讯",
        mobile: "📱 移动专属",
      };
      return map[cat] || "🛠️ 系统工具";
    },
    getAppSummary(file) { return this.getAppItem(file).summary; },
    getAppFeatures(file) { return this.getAppItem(file).features || []; },
    getAppInstallGuide(file) { return this.getAppItem(file).installGuide; },
    getAppIconClass(file) {
      const cat = (this.getAppCategory(file) || "").toLowerCase();
      if (cat === "design") return "ph-palette-fill";
      if (cat === "productivity") return "ph-briefcase-fill";
      if (cat === "developer") return "ph-code-fill";
      if (cat === "utilities") return "ph-wrench-fill";
      if (cat === "entertainment") return "ph-film-strip-fill";
      if (cat === "network") return "ph-globe-hemisphere-east-fill";
      if (cat === "mobile") return "ph-device-mobile-camera-fill";
      const lower = (file?.key || "").toLowerCase();
      if (lower.endsWith(".exe") || lower.endsWith(".msi")) return "ph-windows-logo-fill";
      if (lower.endsWith(".dmg") || lower.endsWith(".pkg")) return "ph-apple-logo-fill";
      if (lower.endsWith(".apk")) return "ph-android-logo-fill";
      return "ph-app-store-logo-fill";
    },
    getAppThemeColor(file) {
      const cat = (this.getAppCategory(file) || "").toLowerCase();
      if (cat === "design") return "linear-gradient(135deg, #f43f5e 0%, #a855f7 100%)";
      if (cat === "productivity") return "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)";
      if (cat === "developer") return "linear-gradient(135deg, #10b981 0%, #0d9488 100%)";
      if (cat === "utilities") return "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)";
      if (cat === "entertainment") return "linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)";
      if (cat === "network") return "linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)";
      if (cat === "mobile") return "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)";
      return "linear-gradient(135deg, #0a84ff 0%, #38bdf8 100%)";
    },
    isMacSoftware(file) {
      const p = (this.getAppPlatform(file) || "").toLowerCase();
      return p.includes("mac") || (file?.key || "").toLowerCase().endsWith(".dmg") || (file?.key || "").toLowerCase().endsWith(".pkg");
    },
    getPlatformClass(file) {
      const p = (this.getAppPlatform(file) || "").toLowerCase();
      if (p.includes("mac")) return "chip-mac";
      if (p.includes("win")) return "chip-win";
      if (p.includes("android") || p.includes("ios") || p.includes("apk") || p.includes("ipa")) return "chip-mobile";
      if (p.includes("linux")) return "chip-linux";
      return "chip-universal";
    },
    openStudioSoftwareDetail(file) {
      this.studioAppDetail = file;
    },
    openStudioSoftwareLinks(file) {
      this.studioAppLinks = file;
    },
    openStudioSoftwareEditor(file) {
      const app = this.getAppItem(file);
      this.studioAppEditor = {
        key: app.key,
        title: app.title,
        version: app.version,
        category: app.category,
        platform: app.platform,
        summary: app.summary,
        featuresText: Array.isArray(app.features) ? app.features.join("\n") : "",
        installGuide: app.installGuide,
      };
    },
    async saveStudioAppEditor() {
      if (!this.studioAppEditor || !this.studioAppEditor.key) return;
      const features = this.studioAppEditor.featuresText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const metaData = {
        title: this.studioAppEditor.title,
        version: this.studioAppEditor.version,
        category: this.studioAppEditor.category,
        platform: this.studioAppEditor.platform,
        summary: this.studioAppEditor.summary,
        features,
        installGuide: this.studioAppEditor.installGuide,
        updatedAt: new Date().toISOString(),
      };

      const currentKey = this.studioAppEditor.key;
      const fullKey = currentKey.startsWith("软件/") ? currentKey : `软件/${currentKey}`;
      const baseKey = currentKey.split("/").pop();

      const updated = {
        ...this.appsMetadata,
        [currentKey]: metaData,
        [fullKey]: metaData,
        [baseKey]: metaData,
      };

      await this.saveAppsMetadata(updated);
      if (this.studioAppDetail && (this.studioAppDetail.key === currentKey || this.studioAppDetail.key === fullKey || this.studioAppDetail.key === baseKey)) {
        this.studioAppDetail = {
          ...this.studioAppDetail,
          ...metaData,
        };
      }
      this.studioAppEditor = null;
    },
    fullDirectUrl(key) {
      if (!key) return "";
      const origin = window.location.origin;
      const path = `/raw/${key}`;
      const query = this.storageId === "default" ? "" : `?storage=${encodeURIComponent(this.storageId)}`;
      return `${origin}${path}${query}`;
    },
    fullShareUrl(key) {
      if (!key) return "";
      const origin = window.location.origin;
      let folder = key.split("/").slice(0, -1).join("/");
      if (folder) folder = `${folder}/`;
      const query = this.storageId === "default" ? `?p=${encodeURIComponent(folder)}` : `?p=${encodeURIComponent(folder)}&storage=${encodeURIComponent(this.storageId)}`;
      return `${origin}/${query}`;
    },
    curlCommand(file) {
      if (!file || !file.key) return "";
      const url = this.fullDirectUrl(file.key);
      const fname = file.key.split("/").pop() || "download";
      return `curl -L -o "${fname}" "${url}"`;
    },
    copyQuarantine(file) {
      if (!file) return;
      const app = this.getAppItem(file);
      const cmd = `sudo xattr -rd com.apple.quarantine /Applications/${(app.appName || "App.app").replace(/\s/g, "\\ ")}`;
      navigator.clipboard.writeText(cmd);
      alert(`已复制 macOS 绕过隔离命令到剪贴板：\n${cmd}`);
    },
    qrCodeUrl(key) {
      if (!key) return "";
      const url = this.fullDirectUrl(key);
      return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
    },
    copyText(text, label = "已复制到剪贴板") {
      navigator.clipboard.writeText(text);
      alert(label);
    },

    onDragEnter(e) { if (e.dataTransfer?.types?.includes("Files")) this.isDragging = true; }, onDragLeave(e) { if (e.clientX === 0 || e.clientY === 0) this.isDragging = false; },
    fileName(key) { return key.split("/").filter(Boolean).pop() || key; }, folderName(folder) { return folder.split("/").filter(Boolean).pop() || "文件"; }, pathUntil(index) { return `${this.pathParts.slice(0, index + 1).join("/")}/`; }, goToFolder(path) { this.filterCategory = "all"; this.mediaPlayer.visible = false; this.lightbox.visible = false; this.archiveModal.visible = false; this.inspector.visible = false; this.docViewer.visible = false; this.cwd = path; }, formatDate(value) { return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }, rawPath(key) { const path = `/raw/${key}`; return this.storageId === "default" ? path : `${path}?storage=${encodeURIComponent(this.storageId)}`; }, authHeaders() { if (!this.authCredentials) return {}; return { Authorization: `Basic ${btoa(`${this.authCredentials.username}:${this.authCredentials.password}`)}` }; }, storageHeaders() { return { "x-storage-id": this.storageId, ...this.authHeaders() }; }, copyLink(link) { navigator.clipboard.writeText(new URL(link, window.location.origin).toString()); this.closeContext(); }, openContext(item, event) { this.focusedItem = item; const width = 218; const height = 270; this.contextPosition = { x: Math.min(event?.clientX || 24, window.innerWidth - width - 12), y: Math.min(event?.clientY || 80, window.innerHeight - height - 12) }; this.showContextMenu = true; }, closeContext() { this.showContextMenu = false; },
    openDialog(options, action) { this.dialog = { visible: true, mode: "input", title: "", message: "", initialValue: "", confirmText: "确定", error: "", ...options }; this.dialogAction = action; }, closeDialog() { this.dialog.visible = false; this.dialogAction = null; }, onDialogSubmit(value) { const action = this.dialogAction; this.closeDialog(); action?.(value); },
    async login(credentials) {
      try {
        const response = await fetch("/api/write/test", { headers: { Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}` } });
        if (!response.ok) return false;
        this.authCredentials = credentials;
        localStorage.setItem("drive-auth", JSON.stringify(credentials));
        sessionStorage.setItem("drive-auth", JSON.stringify(credentials));
        return true;
      } catch (e) { console.error("Login error", e); return false; }
    },
    promptLogin(onSuccess) {
      this.openDialog(
        { mode: "login", title: "登录资源站", message: "输入管理员账号和密码", confirmText: "登录" },
        async (credentials) => {
          const ok = await this.login(credentials);
          if (ok) { onSuccess?.(); } else {
            this.promptLogin(onSuccess);
            this.$nextTick(() => { this.dialog.error = "账号或密码不合规，请重试"; });
          }
        }
      );
    },
    logout() { localStorage.removeItem("drive-auth"); sessionStorage.removeItem("drive-auth"); this.authCredentials = null; location.reload(); },
    async runContextAction(action) {
      const item = this.focusedItem;
      this.closeContext();
      if (action === "logout") return this.logout();
      if (action === "upload") return this.openUploadWithAuth();
      if (action === "create-folder") return this.createFolder();
      if (action === "refresh") return this.fetchFiles(true);
      if (action === "paste") return this.pasteFile();
      if (!item) return;
      if (action === "set-wallpaper") {
        const targetFile = typeof item === "string" ? { key: item } : item;
        const rawUrl = this.rawPath(targetFile.key);
        localStorage.setItem("mac-custom-wallpaper", rawUrl);
        window.dispatchEvent(new CustomEvent("wallpaper-changed", { detail: rawUrl }));
        return;
      }
      if (action === "app-edit-meta") {
        if (this.uiMode === "macos" && this.$refs.macDesktopRef) {
          this.$refs.macDesktopRef.openAppStoreEditor(item);
        } else {
          this.openStudioSoftwareEditor(typeof item === "string" ? { key: item } : item);
        }
        return;
      }
      if (action === "app-get-links") {
        if (this.uiMode === "macos" && this.$refs.macDesktopRef) {
          this.$refs.macDesktopRef.openAppStoreLinks(item);
        } else {
          this.openStudioSoftwareLinks(typeof item === "string" ? { key: item } : item);
        }
        return;
      }
      if (action === "copy-quarantine-cmd") {
        const key = typeof item === "string" ? item : item.key;
        let baseName = key.split("/").pop() || key;
        baseName = baseName.replace(/\.[a-zA-Z0-9_\.]*$/, "");
        const appName = `${baseName}.app`;
        const cmd = `sudo xattr -rd com.apple.quarantine /Applications/${appName.replace(/\s/g, "\\ ")}`;
        navigator.clipboard.writeText(cmd);
        alert(`已复制 macOS 绕过隔离命令到剪贴板：\n${cmd}`);
        return;
      }
      if (action === "inspect") {
        this.inspector = { visible: true, file: typeof item === "string" ? { key: item } : item };
        return;
      }
      if (action === "copy-item") {
        this.clipboard = { action: "copy", item };
        return;
      }
      if (action === "cut-item") {
        this.clipboard = { action: "cut", item };
        return;
      }
      if (action === "open") return this.goToFolder(item);
      if (action === "edit") {
        this.textEditor.file = typeof item === "string" ? { key: item } : item;
        this.textEditor.visible = true;
        return;
      }
      if (action === "preview") {
        let targetFile = typeof item === "string" ? (this.autoGlobalScan ? this.sourceFileList : this.files).find((f) => f.key === item) : item;
        if (!targetFile && typeof item === "string") targetFile = { key: item };
        if (targetFile) return this.openFile(targetFile);
        return this.preview(this.rawPath(item.key || item));
      }
      if (action === "download") {
        if (typeof item === "string") return;
        const link = document.createElement("a");
        link.href = this.rawPath(item.key);
        link.download = this.fileName(item.key);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      if (action === "copy-link" || action === "share") {
        const targetFile = typeof item === "object" ? item : { key: item };
        this.shareModal = { visible: true, file: targetFile, rawUrl: typeof item === "string" ? `/?p=${encodeURIComponent(item)}&storage=${encodeURIComponent(this.storageId)}` : this.rawPath(item.key) };
        return;
      }
      if (action === "rename") return this.renameFile(typeof item === "string" ? item : item.key);
      if (action === "move") return this.moveFile(typeof item === "string" ? `${item}_$folder$` : item.key);
      if (action === "delete") return this.removeFile(typeof item === "string" ? `${item}_$folder$` : item.key);
    },
    sortItems() { const compare = (a, b) => this.order === "size-asc" ? a.size - b.size : this.order === "size-desc" ? b.size - a.size : a.key.localeCompare(b.key, "zh-CN"); this.files.sort(compare); this.folders.sort((a, b) => a.localeCompare(b, "zh-CN")); }, async copyPaste(source, target) { await axios.put(`/api/write/items/${target}`, "", { headers: { ...this.storageHeaders(), "x-amz-copy-source": encodeURIComponent(source) } }); },
    async createFolder() { this.openDialog({ title: "新建文件夹", message: "为文件夹输入一个清晰的名称", confirmText: "创建" }, async (folderName) => { if (!folderName) return; try { await axios.put(`/api/write/items/${this.cwd}${folderName}/_$folder$`, "", { headers: this.storageHeaders() }); this.showUploadPopup = false; this.fetchFiles(); } catch (error) { this.handleWriteError(error); console.error("Create folder failed", error); } }); },
    async fetchStorages() { try { const response = await fetch("/api/storages"); const data = await response.json(); if (Array.isArray(data.storages) && data.storages.length) { this.storageOptions = data.storages; if (!this.storageOptions.some((item) => item.id === this.storageId)) this.storageId = this.storageOptions[0].id; } } catch (error) { console.warn("Storage discovery failed", error); } },
    async fetchFiles(forceScan = false) {
      this.loading = true;
      try {
        const response = await fetch(`/api/children/${this.cwd}`, { headers: this.storageHeaders() });
        const items = await response.json();
        this.files = items.value || [];
        this.folders = items.folders || [];
        this.sortItems();
        if (this.autoGlobalScan && (!this.globalFilesLoaded || forceScan)) {
          await this.fetchGlobalFiles(true);
        }
        if (forceScan) {
          await this.fetchAppsMetadata();
        }
      } catch (error) {
        console.error("Fetch files failed", error);
        this.files = [];
        this.folders = [];
      } finally {
        this.loading = false;
      }
    },
    formatSize(size) { if (!size || isNaN(size)) return "0 B"; const units = ["B", "KB", "MB", "GB", "TB"]; let index = 0; while (size >= 1024 && index < units.length - 1) { size /= 1024; index++; } return `${size.toFixed(index ? 1 : 0)} ${units[index]}`; }, onDrop(event) { this.isDragging = false; const files = event.dataTransfer.items ? [...event.dataTransfer.items].filter((item) => item.kind === "file").map((item) => item.getAsFile()) : event.dataTransfer.files; this.uploadFiles(files); }, onMenuClick(value) { if (value === "toggle-ui-mode") return this.toggleUiMode(); if (value === "logout") return this.logout(); if (value === "paste") return this.pasteFile(); if (value === "toggle-theme") return this.toggleTheme(); this.order = value; this.sortItems(); }, onUploadClicked(fileElement) { if (!fileElement.value) return; const target = this.pendingUploadTargetFolder; this.pendingUploadTargetFolder = null; this.uploadFiles(fileElement.files, target); this.showUploadPopup = false; fileElement.value = null; }, preview(itemOrUrl) { if (typeof itemOrUrl === "object") return this.openFile(itemOrUrl); window.open(itemOrUrl, "_blank", "noopener"); },
    async pasteFile() {
      if (!this.clipboard || !this.clipboard.item) return;
      const { action, item } = this.clipboard;
      const isFolder = typeof item === "string";
      const sourceKey = isFolder ? `${item}_$folder$` : item.key;
      const originalName = isFolder ? this.folderName(item) : this.fileName(item.key);
      
      this.openDialog({
        title: action === "cut" ? "剪切项目" : "粘贴项目",
        message: "可以修改新文件名/目录名，留空使用原名称",
        initialValue: originalName,
        confirmText: "粘贴"
      }, async (name) => {
        if (!name) name = originalName;
        try {
          if (isFolder) {
            const sourceBase = item.endsWith("/") ? item : `${item}/`;
            const targetBase = `${this.cwd}${name}/`;
            const items = await this.getAllItems(sourceBase);
            for (const subItem of items) {
              const nextKey = `${targetBase}${subItem.key.slice(sourceBase.length)}`;
              await this.copyPaste(subItem.key, nextKey);
              if (action === "cut") {
                await axios.delete(`/api/write/items/${subItem.key}`, { headers: this.storageHeaders() });
              }
            }
            await this.copyPaste(sourceKey, `${targetBase}_$folder$`);
            if (action === "cut") {
              await axios.delete(`/api/write/items/${sourceKey}`, { headers: this.storageHeaders() });
              this.clipboard = null;
            }
          } else {
            const targetKey = `${this.cwd}${name}`;
            await this.copyPaste(sourceKey, targetKey);
            if (action === "cut") {
              await axios.delete(`/api/write/items/${sourceKey}`, { headers: this.storageHeaders() });
              this.clipboard = null;
            }
          }
          this.fetchFiles(true);
        } catch (error) {
          this.handleWriteError(error);
        }
      });
    },
    async processUploadQueue() {
      if (!this.uploadQueue.length) {
        await this.fetchFiles(true);
        await this.fetchGlobalFiles(true);
        await this.fetchAppsMetadata();
        this.uploadProgress = null;
        this.uploadFileName = "";
        this.speedText = "";
        this.isUploading = false;
        return;
      }
      const { basedir, file } = this.uploadQueue.shift();
      this.uploadFileName = file.name;
      this.uploadProgress = 0;
      this.speedText = "准备中...";
      let thumbnailDigest = null;
      if (file.type.startsWith("image/") || (file.type.startsWith("video/") && file.size < 50 * 1024 * 1024)) {
        try {
          const thumbnail = await generateThumbnail(file);
          if (thumbnail) {
            thumbnailDigest = await blobDigest(thumbnail);
            await axios.put(`/api/write/items/_$flaredrive$/thumbnails/${thumbnailDigest}.png`, thumbnail, {
              headers: { ...this.storageHeaders(), "Content-Type": "image/png" }
            });
          }
        } catch (error) {
          console.warn("Thumbnail generation failed", error);
        }
      }
      try {
        const contentType = file.type || "application/octet-stream";
        const headers = {
          ...this.storageHeaders(),
          "Content-Type": contentType,
          ...(thumbnailDigest ? { "fd-thumbnail": thumbnailDigest } : {})
        };
        let lastLoaded = 0;
        let lastTime = Date.now();
        const onUploadProgress = ({ loaded, total }) => {
          this.uploadProgress = total ? (loaded * 100) / total : 0;
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          if (timeDiff >= 0.5 && loaded > lastLoaded) {
            const bytesDiff = loaded - lastLoaded;
            const bps = bytesDiff / timeDiff;
            this.speedText = `${this.formatSize(bps)}/s`;
            lastLoaded = loaded;
            lastTime = now;
          }
        };
        if (file.size >= MULTIPART_THRESHOLD) {
          await multipartUpload(`${basedir}${file.name}`, file, { headers, onUploadProgress });
        } else {
          await axios.put(`/api/write/items/${basedir}${file.name}`, file, { headers, onUploadProgress });
        }
      } catch (error) {
        console.error(`Upload ${file.name} failed`, error);
        if (error?.response?.status === 401) {
          this.uploadQueue.unshift({ basedir, file });
          this.isUploading = false;
          this.uploadProgress = null;
          this.uploadFileName = "";
          this.speedText = "";
          this.promptLogin(() => { this.isUploading = true; this.processUploadQueue(); });
          return;
        }
      }
      this.processUploadQueue();
    },
    handleWriteError(error) { if (error?.response?.status === 401) { this.promptLogin(() => { this.fetchFiles(true); }); } }, async removeFile(key) { this.openDialog({ mode: "confirm", title: "删除资源", message: `确定删除“${this.fileName(key)}”吗？`, confirmText: "删除" }, async () => { try { await axios.delete(`/api/write/items/${key}`, { headers: this.storageHeaders() }); this.fetchFiles(true); } catch (error) { this.handleWriteError(error); } }); }, async renameFile(key) { this.openDialog({ title: "重命名资源", message: "输入新的资源名称", initialValue: this.fileName(key), confirmText: "保存" }, async (name) => { if (!name || name === this.fileName(key)) return; try { await this.copyPaste(key, `${this.cwd}${name}`); await axios.delete(`/api/write/items/${key}`, { headers: this.storageHeaders() }); this.fetchFiles(true); } catch (error) { this.handleWriteError(error); } }); },
    async moveFile(key) { this.openDialog({ title: "移动项目", message: "输入目标文件夹路径，留空移动到根目录", confirmText: "移动" }, async (destination) => { const target = destination ? `${destination.replace(/^\/+|\/+$/g, "")}/` : ""; const isFolder = key.endsWith("_$folder$"); const sourceName = isFolder ? this.folderName(key.slice(0, -9)) : this.fileName(key); try { if (isFolder) { const sourceBase = key.slice(0, -9); const targetBase = `${target}${sourceName}/`; const items = await this.getAllItems(sourceBase); for (const item of items) { const nextKey = `${targetBase}${item.key.slice(sourceBase.length)}`; await this.copyPaste(item.key, nextKey); await axios.delete(`/api/write/items/${item.key}`, { headers: this.storageHeaders() }); } await this.copyPaste(key, `${targetBase}_$folder$`); await axios.delete(`/api/write/items/${key}`, { headers: this.storageHeaders() }); } else { await this.copyPaste(key, `${target}${sourceName}`); await axios.delete(`/api/write/items/${key}`, { headers: this.storageHeaders() }); } this.fetchFiles(true); } catch (error) { this.handleWriteError(error); console.error("Move failed", error); } }); },
    getCategoryTargetFolder(category) {
      const map = {
        image: "照片/",
        video: "视频/",
        audio: "音乐/",
        software: "软件/",
        app: "软件/",
        document: "文档/",
        archive: "下载/",
      };
      return map[category] || "";
    },
    async autoInitSystemFolders() {
      const defaultFolders = ["照片", "视频", "音乐", "软件", "文档", "下载"];
      if (!this.authCredentials) {
        this.promptLogin(() => this.autoInitSystemFolders());
        return;
      }
      try {
        for (const f of defaultFolders) {
          const key = `${f}/_$folder$`;
          try {
            await axios.put(`/api/write/items/${key}`, "", { headers: this.storageHeaders() });
          } catch (e) {
            console.warn(`Create default folder ${f} failed:`, e);
          }
        }
        await this.fetchFiles(true);
        this.fetchGlobalFiles(true);
      } catch (err) {
        this.handleWriteError(err);
      }
    },
    async fetchAppsMetadata() {
      try {
        const cached = localStorage.getItem(`mac_apps_meta_${this.storageId}`);
        if (cached) {
          try { this.appsMetadata = JSON.parse(cached); } catch {}
        }
        const res = await fetch(`/raw/_$flaredrive$/apps_meta.json?storage=${encodeURIComponent(this.storageId)}&t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === "object") {
            this.appsMetadata = data;
            localStorage.setItem(`mac_apps_meta_${this.storageId}`, JSON.stringify(data));
          }
        }
      } catch (e) {
        console.warn("Fetch apps metadata notice:", e);
      }
    },
    async saveAppsMetadata(updated) {
      this.appsMetadata = updated;
      localStorage.setItem(`mac_apps_meta_${this.storageId}`, JSON.stringify(updated));
      try {
        const blob = new Blob([JSON.stringify(updated, null, 2)], { type: "application/json" });
        await axios.put(`/api/write/items/_$flaredrive$/apps_meta.json`, blob, {
          headers: { ...this.storageHeaders(), "Content-Type": "application/json" }
        });
      } catch (err) {
        console.warn("Save apps metadata failed, preserved in local cache:", err);
      }
    },
    async handleSoftwareUpload({ file, metadata, targetFolder }) {
      const folder = targetFolder || "软件/";
      const cleanFolder = folder.endsWith("/") ? folder : `${folder}/`;
      const fileName = file.name;
      const targetKeyWithFolder = `${cleanFolder}${fileName}`;
      const targetKeySimple = fileName;
      const updated = {
        ...this.appsMetadata,
        [targetKeyWithFolder]: metadata,
        [targetKeySimple]: metadata,
      };
      await this.saveAppsMetadata(updated);
      this.uploadFiles([file], folder);
    },
    openUploadWithAuth(targetFolder = null) {
      if (!this.authCredentials) {
        this.promptLogin(() => { this.openUploadWithAuth(targetFolder); });
        return;
      }
      this.pendingUploadTargetFolder = typeof targetFolder === "string" ? targetFolder : null;
      this.showUploadPopup = true;
    },
    uploadFiles(files, customCwd = null) {
      if (!files || !files.length) return;
      if (!this.authCredentials) {
        this.promptLogin(() => this.uploadFiles(files, customCwd));
        return;
      }
      let targetCwd = customCwd;
      if (targetCwd === null || targetCwd === undefined) {
        if (this.filterCategory !== "all") {
          targetCwd = this.getCategoryTargetFolder(this.filterCategory);
        } else {
          targetCwd = this.cwd;
        }
      }
      if (targetCwd && !targetCwd.endsWith("/")) targetCwd += "/";
      this.uploadQueue.push(...Array.from(files).map((file) => ({ basedir: targetCwd, file })));
      if (!this.isUploading && this.uploadQueue.length) {
        this.isUploading = true;
        this.processUploadQueue();
      }
    },
    handleMacDropFiles({ files, cwd, targetFolder }) {
      this.uploadFiles(files, targetFolder || cwd);
    },
    toggleTheme() {
      this.theme = this.theme === "dark" ? "light" : "dark";
      localStorage.setItem("drive-theme", this.theme);
      document.documentElement.setAttribute("data-theme", this.theme);
    },
    isDocViewer(file) {
      if (!file || !file.key) return false;
      return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(file.key);
    },
    highlightText(text) {
      if (!this.search || !text) return text;
      const escaped = this.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, "gi");
      return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    },
    handleInspectorAction({ type, file }) {
      this.inspector.visible = false;
      if (type === "preview") return this.openFile(file);
      if (type === "share") {
        this.shareModal = { visible: true, file, rawUrl: this.rawPath(file.key) };
      }
    },
    onGlobalKeydown(e) {
      if (this.uiMode === "macos") {
        return; // In macOS mode, MacDesktop handles all shortcuts, windows, and previews
      }
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;
      
      // 1. Hotkey ? for HotkeysModal
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        this.showHotkeysModal = !this.showHotkeysModal;
        return;
      }
      
      // 2. Hotkey ⌘K / Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.showSearchInput = true;
        this.$nextTick(() => this.$refs.searchInputRef?.focus());
        return;
      }

      // 3. Spacebar QuickLook
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (this.lightbox.visible || this.mediaPlayer.visible || this.archiveModal.visible || this.textEditor.visible || this.docViewer.visible || this.inspector.visible) {
          this.lightbox.visible = false;
          this.mediaPlayer.visible = false;
          this.archiveModal.visible = false;
          this.textEditor.visible = false;
          this.docViewer.visible = false;
          this.inspector.visible = false;
          return;
        }
        const target = this.focusedItem || (this.filteredFiles.length ? this.filteredFiles[0] : null);
        if (target) {
          this.openFile(target);
        }
        return;
      }

      // 4. Hotkey "I" or "i" for Inspector
      if (e.key.toLowerCase() === "i" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const target = this.focusedItem || (this.filteredFiles.length ? this.filteredFiles[0] : null);
        if (target && typeof target === "object") {
          this.inspector = { visible: !this.inspector.visible, file: target };
        }
        return;
      }

      // 5. Esc closes all modals & context menu
      if (e.key === "Escape") {
        this.closeContext();
        this.showMenu = false;
        this.showHotkeysModal = false;
        this.showUploadPopup = false;
        this.inspector.visible = false;
        this.docViewer.visible = false;
      }
    },
    switchUiMode(mode) {
      this.uiMode = mode;
      localStorage.setItem("ui-mode", mode);
    },
    toggleUiMode() {
      this.switchUiMode(this.uiMode === "macos" ? "studio" : "macos");
    },
    handleMacAction(action) {
      if (action === "reload") return this.fetchFiles(true);
      if (action === "logout") return this.logout();
      if (action === "new-folder") return this.createFolder();
      if (action === "upload") return this.openUploadWithAuth();
      if (action === "paste") return this.pasteFile();
      if (action === "hotkeys") this.showHotkeysModal = true;
      if (action === "view-grid") this.viewMode = "grid";
      if (action === "view-list") this.viewMode = "list";
      if (action === "select-all") {
        // Spotlight or finder selection
      }
      if (action === "toggle-fullscreen") {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    },
  },
  watch: {
    theme: {
      handler(val) {
        document.documentElement.setAttribute("data-theme", val);
      },
      immediate: true
    },
    cwd: { handler() { this.fetchFiles(); const url = new URL(window.location); this.cwd ? url.searchParams.set("p", this.cwd) : url.searchParams.delete("p"); window.history.pushState(null, "", url); document.title = `${this.currentFolderName} · 天才猫 R2 网盘系统`; }, immediate: true },
    storageId(value) { const url = new URL(window.location); value === "default" ? url.searchParams.delete("storage") : url.searchParams.set("storage", value); window.history.replaceState(null, "", url); this.loadCachedGlobalIndex(); this.fetchFiles(); },
    viewMode(value) { localStorage.setItem("drive-view", value); }
  },
  created() {
    document.documentElement.setAttribute("data-theme", this.theme);
    this.loadCachedGlobalIndex();
    this.fetchStorages();
    this.fetchGlobalFiles(true);
    this.fetchAppsMetadata();
    window.addEventListener("popstate", () => {
      const url = new URL(window.location);
      this.cwd = url.searchParams.get("p") || "";
      this.storageId = url.searchParams.get("storage") || "default";
    });
    window.addEventListener("keydown", this.onGlobalKeydown);
  },
  unmounted() {
    window.removeEventListener("keydown", this.onGlobalKeydown);
  },
  components: { Menu, MimeIcon, UploadPopup, UploadProgress, ContextMenu, PromptDialog, LightboxModal, MediaPlayerModal, ArchiveModal, HotkeysModal, CatLogo, ShareModal, TextEditorModal, FileInspectorModal, DocumentViewerModal, MacDesktop },
};
</script>
