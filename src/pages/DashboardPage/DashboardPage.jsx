import React from 'react';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { TabBar } from '../../components/TabBar/TabBar';
import { Header } from '../../components/Header/Header';
import { QuillEditor } from '../../components/QuillEditor/QuillEditor';
import { SaveLiveSheetModal } from '../../components/Modals/SaveLiveSheetModal';
import { ConflictResolutionModal } from '../../components/Modals/ConflictResolutionModal';
import { ArchivedPreviewModal } from '../../components/Modals/ArchivedPreviewModal';
import { ToastContainer } from '../../components/Toast/ToastContainer';
import { useDashboardPage } from './useDashboardPage';
import { HEADINGS } from '../../constants/headings';
import './DashboardPage.css';

export default function DashboardPage() {
  const {
    activeSheet,
    categories,
    savedSheets,
    archivedSheets,
    openTabs,
    activeTabId,
    sidebarOpen,
    toasts,
    showSaveModal,
    saveTitle,
    saveCatId,
    saveType,
    countdownText,
    conflictData,
    previewArchivedSheet,
    remoteTrigger,
    setActiveTabId,
    setSidebarOpen,
    setSaveTitle,
    setSaveCatId,
    setSaveType,
    setShowSaveModal,
    setPreviewArchivedSheet,
    setConflictData,
    handleContentChange,
    handleFormatJson,
    handleCreateCategory,
    handleSaveLiveSheet,
    handleDeleteLiveSheet,
    handleOpenSavedSheet,
    handleCloseTab,
    handleSaveSavedSheet,
    handleRefreshSavedSheet,
    handleDeleteSavedSheetFromTab,
    handleTabPropertiesChange,
    handleResolveKeepServer,
    handleResolveCombine,
    handleLoadArchivedToLive,
    handleDeleteArchivedSheet,
    removeToast,
    activeSavedTab,
    isLiveLocked,
    handleTakeControl,
  } = useDashboardPage();

  return (
    <div className="app-container">
      {/* Sidebar Component */}
      <Sidebar
        categories={categories}
        savedSheets={savedSheets}
        archivedSheets={archivedSheets}
        activeSheet={activeSheet}
        onCreateCategory={handleCreateCategory}
        onSaveLiveSheet={() => {
          setSaveTitle(activeSheet?.title || '');
          setSaveType('saved');
          setShowSaveModal(true);
        }}
        onDeleteLiveSheet={handleDeleteLiveSheet}
        onOpenSavedSheet={handleOpenSavedSheet}
        onOpenArchivedSheet={setPreviewArchivedSheet}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTabId={activeTabId}
      />

      {/* Main Workspace */}
      <main className="main-content">
        {/* Dynamic Tab Bar */}
        <TabBar
          openTabs={openTabs}
          activeTabId={activeTabId}
          setActiveTabId={setActiveTabId}
          handleCloseTab={handleCloseTab}
        />

        {/* Tab Header Toolbar */}
        <Header
          activeTabId={activeTabId}
          activeSheet={activeSheet}
          countdownText={countdownText}
          activeSavedTab={activeSavedTab}
          categories={categories}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleTabPropertiesChange={handleTabPropertiesChange}
          handleRefreshSavedSheet={handleRefreshSavedSheet}
          handleSaveSavedSheet={handleSaveSavedSheet}
          handleDeleteSavedSheetFromTab={handleDeleteSavedSheetFromTab}
          handleFormatJson={handleFormatJson}
          isLiveLocked={isLiveLocked}
          handleTakeControl={handleTakeControl}
        />

        {/* Content Editor */}
        {activeTabId === 'live' ? (
          activeSheet ? (
            <div className="editor-container">
              <QuillEditor
                content={activeSheet.content}
                onChange={handleContentChange}
                remoteTrigger={remoteTrigger}
                sheetId={activeSheet.id}
                readOnly={isLiveLocked}
              />
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              {HEADINGS.DASHBOARD.INITIALIZING_LIVE}
            </div>
          )
        ) : activeSavedTab ? (
          <div className="editor-container">
            <QuillEditor
              content={activeSavedTab.content}
              onChange={handleContentChange}
              remoteTrigger={remoteTrigger}
              sheetId={activeSavedTab.id}
            />
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            {HEADINGS.DASHBOARD.SELECT_TAB_PROMPT}
          </div>
        )}
      </main>

      {/* Save / Archive Live Sheet Modal */}
      <SaveLiveSheetModal
        showSaveModal={showSaveModal}
        setShowSaveModal={setShowSaveModal}
        saveTitle={saveTitle}
        setSaveTitle={setSaveTitle}
        saveCatId={saveCatId}
        setSaveCatId={setSaveCatId}
        saveType={saveType}
        setSaveType={setSaveType}
        categories={categories}
        handleSaveLiveSheet={handleSaveLiveSheet}
      />

      {/* Concurrency Conflict Resolution Modal */}
      <ConflictResolutionModal
        conflictData={conflictData}
        setConflictData={setConflictData}
        handleSaveSavedSheet={handleSaveSavedSheet}
        handleResolveKeepServer={handleResolveKeepServer}
        handleResolveCombine={handleResolveCombine}
      />

      {/* Archived Preview Modal */}
      <ArchivedPreviewModal
        previewArchivedSheet={previewArchivedSheet}
        setPreviewArchivedSheet={setPreviewArchivedSheet}
        handleLoadArchivedToLive={handleLoadArchivedToLive}
        handleDeleteArchivedSheet={handleDeleteArchivedSheet}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
