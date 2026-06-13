import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  BookOpen,
  Plus,
  Loader2,
  Search,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Archive,
  Download,
  Trash2,
  Users,
  Eye,
  Globe,
  UploadCloud,
  File,
  X,
  ExternalLink,
} from 'lucide-react';
import { socket } from '../layouts/DashboardLayout';
import API from '../services/api';
import { toast } from 'react-toastify';

const Wiki = () => {
  const { currentWorkspace, currentRole } = useSelector((state) => state.workspace);
  const { user: currentUser } = useSelector((state) => state.auth);

  // General state
  const [activeTab, setActiveTab] = useState('docs'); // 'docs' or 'attachments'
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Tab 1: Collaborative Documents States
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);

  // Tab 2: Attachments & Links States
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Modals & Upload
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Link form states
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [attachingLink, setAttachingLink] = useState(false);

  // File upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // ----------------------------------------------------
  // DATA LOADING
  // ----------------------------------------------------
  
  // Load collaborative wiki documents
  const loadDocuments = async () => {
    if (!currentWorkspace?._id) return;
    setDocsLoading(true);
    try {
      const res = await API.get(`/documents?workspaceId=${currentWorkspace._id}`);
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load wiki pages');
    } finally {
      setDocsLoading(false);
    }
  };

  // Load wiki attachments (Files/Links)
  const loadAttachments = async () => {
    if (!currentWorkspace?._id) return;
    setAttachmentsLoading(true);
    try {
      const res = await API.get(`/files?workspaceId=${currentWorkspace._id}`);
      setAttachments(res.data.files || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load wiki attachments');
    } finally {
      setAttachmentsLoading(true);
      setAttachmentsLoading(false);
    }
  };

  // Load workspace members
  const loadMembers = async () => {
    if (!currentWorkspace?._id) return;
    setMembersLoading(true);
    try {
      const res = await API.get(`/members?workspaceId=${currentWorkspace._id}`);
      setMembers(res.data.members || []);
    } catch (err) {
      console.error(err);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadAttachments();
    loadMembers();
    setSelectedDoc(null); // Reset selection on workspace change
  }, [currentWorkspace]);

  // ----------------------------------------------------
  // REAL-TIME DOCUMENT COLLABORATION (SOCKETS)
  // ----------------------------------------------------
  
  useEffect(() => {
    if (!selectedDoc?._id || !socket) return;

    // Join document room
    socket.emit('join_document', selectedDoc._id);

    // Listen for real-time edits from other users
    const handleDocumentUpdated = (data) => {
      if (data.docId === selectedDoc._id) {
        setSelectedDoc((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            title: data.title !== undefined ? data.title : prev.title,
            content: data.content !== undefined ? data.content : prev.content,
            lastEditedBy: data.user ? { name: data.user } : prev.lastEditedBy,
          };
        });
        
        // Update documents sidebar list title immediately
        setDocuments((prevDocs) =>
          prevDocs.map((doc) =>
            doc._id === data.docId
              ? { ...doc, title: data.title !== undefined ? data.title : doc.title }
              : doc
          )
        );
      }
    };

    socket.on('document_updated', handleDocumentUpdated);

    return () => {
      socket.emit('leave_document', selectedDoc._id);
      socket.off('document_updated', handleDocumentUpdated);
    };
  }, [selectedDoc?._id]);

  // ----------------------------------------------------
  // DOCUMENT OPERATIONS & AUTO-SAVE
  // ----------------------------------------------------

  const saveDocumentBackend = async (docId, title, content) => {
    try {
      setSavingDoc(true);
      await API.put(`/documents/${docId}`, { title, content });
    } catch (err) {
      console.error('Document auto-save error:', err);
    } finally {
      setSavingDoc(false);
    }
  };

  const handleTitleChange = (newTitle) => {
    if (!selectedDoc) return;

    setSelectedDoc((prev) => ({ ...prev, title: newTitle }));
    setDocuments((prev) =>
      prev.map((d) => (d._id === selectedDoc._id ? { ...d, title: newTitle } : d))
    );

    // Send change to other users in real-time
    socket.emit('edit_document', {
      docId: selectedDoc._id,
      title: newTitle,
      content: selectedDoc.content,
      user: currentUser?.name,
    });

    // Auto-save debounce (800ms)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDocumentBackend(selectedDoc._id, newTitle, selectedDoc.content);
    }, 800);
  };

  const handleContentChange = (newContent) => {
    if (!selectedDoc) return;

    setSelectedDoc((prev) => ({ ...prev, content: newContent }));

    // Send change to other users in real-time
    socket.emit('edit_document', {
      docId: selectedDoc._id,
      title: selectedDoc.title,
      content: newContent,
      user: currentUser?.name,
    });

    // Auto-save debounce (800ms)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDocumentBackend(selectedDoc._id, selectedDoc.title, newContent);
    }, 800);
  };

  const handleCreateDoc = async () => {
    if (!currentWorkspace?._id) return;
    try {
      setDocsLoading(true);
      const res = await API.post('/documents', {
        title: 'New Page',
        content: '',
        workspaceId: currentWorkspace._id,
      });

      if (res.data?.success) {
        setDocuments((prev) => [res.data.document, ...prev]);
        setSelectedDoc(res.data.document);
        toast.success('New wiki page created!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to create wiki page');
    } finally {
      setDocsLoading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this wiki page?')) return;
    try {
      const res = await API.delete(`/documents/${docId}`);
      if (res.data?.success) {
        toast.success('Document deleted successfully');
        setDocuments((prev) => prev.filter((d) => d._id !== docId));
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete document');
    }
  };

  const handleSelectDoc = (doc) => {
    // Clear save timer for previously active doc before switching
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSelectedDoc(doc);
  };

  // ----------------------------------------------------
  // ATTACHMENT ACTIONS & DRAG AND DROP
  // ----------------------------------------------------

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!selectedFile || !currentWorkspace?._id) return;

    setUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('workspaceId', currentWorkspace._id);

    try {
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const res = await API.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (res.data?.success) {
        toast.success('File uploaded successfully!');
        setSelectedFile(null);
        setFileModalOpen(false);
        loadAttachments();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAttachLink = async (e) => {
    e.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim() || !currentWorkspace?._id) return;

    setAttachingLink(true);
    try {
      let formattedUrl = linkUrl.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const res = await API.post('/files/link', {
        name: linkTitle,
        url: formattedUrl,
        workspaceId: currentWorkspace._id,
      });

      if (res.data?.success) {
        toast.success('Resource link attached!');
        setLinkTitle('');
        setLinkUrl('');
        setLinkModalOpen(false);
        loadAttachments();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to attach link');
    } finally {
      setAttachingLink(false);
    }
  };

  const handleDeleteAttachment = async (fileId) => {
    if (!window.confirm('Are you sure you want to remove this item?')) return;
    try {
      const res = await API.delete(`/files/${fileId}`);
      if (res.data?.success) {
        toast.success('Wiki item removed');
        loadAttachments();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete item');
    }
  };

  // ----------------------------------------------------
  // HELPERS & FILTERING
  // ----------------------------------------------------

  const formatBytes = (bytes, decimals = 1) => {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getFileIcon = (item) => {
    if (item.type === 'link') return <LinkIcon className="h-5 w-5 text-teal-500" />;
    
    const mime = item.mimeType?.toLowerCase() || '';
    if (mime.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-emerald-500" />;
    if (mime.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('gzip')) {
      return <Archive className="h-5 w-5 text-amber-500" />;
    }
    return <File className="h-5 w-5 text-slate-500" />;
  };

  // Filtering wiki attachments
  const filteredAttachments = attachments.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'All') return matchesSearch;
    if (activeFilter === 'Links') return item.type === 'link' && matchesSearch;
    if (activeFilter === 'Images') return item.type === 'file' && item.mimeType?.startsWith('image/') && matchesSearch;
    if (activeFilter === 'PDFs') return item.type === 'file' && item.mimeType?.includes('pdf') && matchesSearch;
    if (activeFilter === 'Archives') return item.type === 'file' && (item.mimeType?.includes('zip') || item.mimeType?.includes('rar')) && matchesSearch;
    
    if (activeFilter === 'Others') {
      const isSpecial = item.type === 'link' || item.mimeType?.startsWith('image/') || item.mimeType?.includes('pdf') || item.mimeType?.includes('zip');
      return !isSpecial && matchesSearch;
    }
    return matchesSearch;
  });

  // Filtering collaborative docs
  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8.5rem)]">
      {/* LEFT MODULE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Tab switcher header */}
        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3 gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-emerald-500" />
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-850">
              <button
                onClick={() => setActiveTab('docs')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all duration-200 ${
                  activeTab === 'docs'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Collab Docs
              </button>
              <button
                onClick={() => setActiveTab('attachments')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all duration-200 ${
                  activeTab === 'attachments'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Shared Assets
              </button>
            </div>
          </div>

          {/* Actions based on active tab */}
          {activeTab === 'attachments' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLinkModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 px-3.5 py-2 text-xs font-bold text-slate-605 dark:text-slate-300 shadow-sm cursor-pointer transition-colors"
              >
                <Globe className="h-4 w-4 text-emerald-500" /> Attach Link
              </button>
              <button
                onClick={() => setFileModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-650 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/15 cursor-pointer transition-all duration-200"
              >
                <Plus className="h-4 w-4" /> Upload File
              </button>
            </div>
          ) : (
            <button
              onClick={handleCreateDoc}
              disabled={docsLoading}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-650 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/15 cursor-pointer transition-all duration-200"
            >
              <Plus className="h-4 w-4" /> New Wiki Page
            </button>
          )}
        </div>

        {/* Tab 1: Collaborative Wiki Docs */}
        {activeTab === 'docs' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 overflow-hidden mt-4">
            {/* Left Page index Column */}
            <div className="md:col-span-1 border-r border-slate-200/40 dark:border-slate-800/60 pr-4 flex flex-col h-full overflow-hidden space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 transition-colors premium-input"
                />
              </div>

              {/* Document List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-premium">
                {docsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <p className="text-center text-3xs text-slate-400 italic py-6">No pages created yet.</p>
                ) : (
                  filteredDocs.map((doc) => (
                    <button
                      key={doc._id}
                      onClick={() => handleSelectDoc(doc)}
                      className={`flex w-full items-center gap-2 px-3.5 py-2.5 rounded-xl text-left text-xs font-extrabold transition-all duration-200 ${
                        selectedDoc?._id === doc._id
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/10'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-900/25 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>📄</span>
                      <span className="truncate">{doc.title}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right Editing Column */}
            <div className="md:col-span-3 flex flex-col h-full overflow-hidden">
              {selectedDoc ? (
                <div className="flex flex-col h-full space-y-4">
                  {/* Save Status & Delete Page */}
                  <div className="flex items-center justify-between border-b border-slate-200/30 dark:border-slate-800/40 pb-3">
                    <div className="flex items-center gap-2 text-3xs font-semibold">
                      {savingDoc ? (
                        <span className="flex items-center gap-1.5 text-emerald-500 font-extrabold">
                          <Loader2 className="h-3 w-3 animate-spin" /> Auto-saving to workspace...
                        </span>
                      ) : (
                        <span className="text-slate-400">All edits synchronized</span>
                      )}
                      {selectedDoc.lastEditedBy && (
                        <span className="text-slate-400 dark:text-slate-500 font-medium ml-1">
                          • Last edit by {selectedDoc.lastEditedBy.name}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteDoc(selectedDoc._id)}
                      className="text-4xs font-bold text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-xl hover:bg-rose-500/5 transition-colors cursor-pointer border border-transparent hover:border-rose-500/10"
                    >
                      Delete Page
                    </button>
                  </div>

                  {/* Title */}
                  <input
                    type="text"
                    value={selectedDoc.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Page Title"
                    className="w-full bg-transparent font-heading font-extrabold text-xl md:text-2xl text-slate-850 dark:text-white outline-none border-b border-transparent focus:border-slate-200/50 dark:focus:border-slate-800 pb-2 placeholder-slate-350"
                  />

                  {/* Collaborative Content Editor */}
                  <div className="flex-1 flex flex-col min-h-[250px] relative">
                    <textarea
                      value={selectedDoc.content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder="Start writing meeting summaries, roadmap specifications, or wikis here... (edits sync live with online members)"
                      className="w-full flex-1 bg-white/40 dark:bg-slate-950/10 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-4 text-xs font-semibold leading-relaxed outline-none focus:border-emerald-500/35 transition-all scrollbar-premium text-slate-750 dark:text-slate-300 placeholder-slate-455"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 h-full py-16 text-center">
                  <div className="h-16 w-16 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full flex items-center justify-center text-slate-350 dark:text-slate-700 shadow-inner mb-4">
                    <BookOpen className="h-8 w-8 text-emerald-500 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-850 dark:text-slate-200">No Wiki Page Selected</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 max-w-sm leading-relaxed">
                    Select a collaborative document from the sidebar page index, or create a brand new page to start drafting wiki documentation.
                  </p>
                  <button
                    onClick={handleCreateDoc}
                    className="mt-6 flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 px-4.5 py-2 text-xs font-bold text-slate-750 dark:text-slate-300 transition-all cursor-pointer hover:border-emerald-500/30"
                  >
                    <Plus className="h-4 w-4 text-emerald-500" /> Create Wiki Page
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tab 2: Shared Assets & Bookmarks (Original Content) */
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 glass-card p-3 rounded-2xl shadow-sm mt-4 shrink-0">
              {/* Filter tabs */}
              <div className="flex flex-wrap gap-1">
                {['All', 'PDFs', 'Images', 'Links', 'Archives', 'Others'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      activeFilter === filter
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold dark:bg-emerald-950/35'
                        : 'text-slate-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 dark:text-slate-400 border border-transparent'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search attachments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/20 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 transition-colors premium-input"
                />
              </div>
            </div>

            {/* Items Listing */}
            <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-premium">
              {attachmentsLoading ? (
                <div className="flex h-full items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : filteredAttachments.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 glass-card py-16 shadow-2xs">
                  <div className="h-16 w-16 bg-slate-55/20 dark:bg-slate-955/50 rounded-full flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                    <BookOpen className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Wiki items found
                  </h3>
                  <p className="text-xs text-slate-450 dark:text-slate-500 mt-1 max-w-xs leading-relaxed">
                    {searchQuery || activeFilter !== 'All'
                      ? 'No items match your active search filters.'
                      : 'Upload PDFs, images, reference links, and folders to assemble the team knowledge base.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredAttachments.map((item) => {
                    const isUploader = item.uploadedBy?._id === currentUser?._id;
                    const canDelete = isUploader || ['Admin', 'Manager'].includes(currentRole);

                    return (
                      <div
                        key={item._id}
                        className="glass-card glass-card-hover p-5 flex flex-col justify-between group relative"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50/50 dark:bg-slate-955 shadow-inner border border-slate-100 dark:border-slate-850">
                              {getFileIcon(item)}
                            </div>
                            
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteAttachment(item._id)}
                                className="text-slate-400 hover:text-red-500 rounded-lg p-1 hover:bg-red-55/10 cursor-pointer transition-colors"
                                title="Delete attachment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <h3
                            className="font-heading font-bold text-xs text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-emerald-500 transition-colors"
                            title={item.name}
                          >
                            {item.name}
                          </h3>

                          <div className="mt-3.5 flex flex-col gap-1 text-3xs text-slate-405 font-semibold">
                            <p className="flex items-center gap-1">
                              <span className="text-slate-400">Uploaded by:</span>
                              <strong className="text-slate-500 dark:text-slate-350">{item.uploadedBy?.name || 'Unknown'}</strong>
                            </p>
                            <p className="text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-850 mt-4 pt-3 flex items-center justify-between gap-2">
                          <span className="text-3xs font-extrabold text-slate-400 dark:text-slate-505 uppercase tracking-wider">
                            {item.type === 'link' ? 'LINK' : formatBytes(item.size)}
                          </span>

                          {item.type === 'link' ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-3xs font-bold text-emerald-500 hover:underline hover:text-emerald-600 transition-colors"
                            >
                              Visit Link <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 p-1 px-2.5 text-3xs font-bold text-slate-600 dark:text-slate-300 transition-colors border border-slate-200/50 dark:border-slate-850"
                                title="View file"
                              >
                                <Eye className="h-3 w-3" /> View
                              </a>
                              <a
                                href={item.url}
                                download={item.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-950/20 dark:hover:bg-emerald-955/45 p-1 px-2.5 text-3xs font-bold text-emerald-600 dark:text-emerald-450 transition-colors border border-emerald-100/35 dark:border-emerald-950/50"
                                title="Download file"
                              >
                                <Download className="h-3 w-3" /> Get
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* RIGHT SIDEBAR - WORKSPACE MEMBERS PANEL */}
      <div className="w-full lg:w-72 glass-card p-5 shadow-sm h-fit shrink-0">
        <div className="flex items-center gap-2 border-b border-slate-205 dark:border-slate-805 pb-3 mb-4">
          <Users className="h-4.5 w-4.5 text-emerald-500" />
          <h2 className="font-heading font-bold text-sm text-slate-800 dark:text-white">
            Workspace Members
          </h2>
        </div>

        {membersLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          </div>
        ) : (
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-premium">
            {members.map((member) => (
              <div key={member._id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850/80">
                <div className="relative shrink-0">
                  <img
                    src={member.user?.avatar}
                    alt={member.user?.name}
                    className="h-7 w-7 rounded-full object-cover border border-slate-100 dark:border-slate-850"
                  />
                  <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white dark:border-slate-950 ${
                    member.user?.status === 'online' ? 'bg-emerald-500' : member.user?.status === 'away' ? 'bg-amber-500' : 'bg-slate-400'
                  }`}></span>
                </div>
                <div className="truncate text-3xs">
                  <h4 className="font-bold text-slate-700 dark:text-slate-200 truncate">{member.user?.name}</h4>
                  <span className="text-emerald-500 font-extrabold uppercase text-[9px] tracking-wider mt-0.5 block">{member.role}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: UPLOAD FILE */}
      {fileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 scale-in duration-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-805 pb-3 mb-4">
              <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <UploadCloud className="h-5 w-5 text-emerald-500 animate-bounce" /> Upload Workspace Asset
              </h3>
              <button
                onClick={() => setFileModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 rounded p-1 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleUploadFile} className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-slate-250 dark:border-slate-800 hover:border-emerald-500/35 bg-slate-50/20 dark:bg-slate-950/20'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center">
                  <UploadCloud className="h-10 w-10 text-slate-400 mb-2.5" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {selectedFile ? selectedFile.name : 'Click to select or drag & drop file'}
                  </p>
                  <p className="text-[10px] text-slate-455 mt-1">Supports PDFs, Images, Archives up to 10MB</p>
                </div>
              </div>

              {/* Progress Bar */}
              {uploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-3xs font-extrabold text-emerald-500">
                    <span>Uploading file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-205 dark:border-slate-855">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300 shadow-sm"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Submit footer */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-805/50">
                <button
                  type="button"
                  onClick={() => setFileModalOpen(false)}
                  disabled={uploading}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-650 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Upload'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ATTACH LINK */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 scale-in duration-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-805 pb-3 mb-4">
              <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Globe className="h-5 w-5 text-indigo-500" /> Attach External Reference Link
              </h3>
              <button
                onClick={() => setLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 rounded p-1 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleAttachLink} className="space-y-4">
              <div>
                <label className="text-3xs font-semibold text-slate-400 dark:text-slate-550 uppercase block mb-1 tracking-wider">
                  Link Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Design Specs, Figma File"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 premium-input"
                  required
                />
              </div>

              <div>
                <label className="text-3xs font-semibold text-slate-400 dark:text-slate-550 uppercase block mb-1 tracking-wider">
                  URL / Destination Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. docs.google.com/document/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 premium-input"
                  required
                />
              </div>

              {/* Submit footer */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-805/50">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  disabled={attachingLink}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-slate-550 hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attachingLink}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-650 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {attachingLink ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Attach Link'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wiki;
