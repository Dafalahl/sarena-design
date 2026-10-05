'use client'

import { useState, useEffect, use, useRef, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Upload,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Lock,
  Briefcase,
  FileCheck2,
  Sparkles,
  Folder,
  File,
  Trash2,
  FolderPlus,
  FileCode,
  Image as ImageIcon,
  Plus,
  ChevronRight,
  ChevronDown,
  Eye,
  Check,
  X,
  Send,
  MessageSquare,
  Search,
  CheckCheck,
  HardDrive,
  Pin,
  MoreVertical,
  LayoutGrid,
  Settings,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import UserAvatar from '@/components/UserAvatar'


export default function WorkspaceDetailPage(props) {
  return (
    <Suspense fallback={<div className="p-8 text-center font-mono font-bold">Loading Workspace Details...</div>}>
      <WorkspaceDetailContent {...props} />
    </Suspense>
  )
}

const convertToWebP = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get 2D context from canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to generate WebP blob"));
            return;
          }
          const originalName = file.name;
          const lastDotIndex = originalName.lastIndexOf('.');
          const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
          const newName = `${baseName}.webp`;
          const webpFile = new window.File([blob], newName, { type: 'image/webp' });
          resolve(webpFile);
        }, 'image/webp', 0.85);
      };
      img.onerror = (err) => reject(new Error("Failed to load image"));
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

function WorkspaceDetailContent({ params }) {
  const unwrappedParams = params && typeof params.then === 'function' ? use(params) : params;
  const id = unwrappedParams?.id;
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')

  const [currentUser, setCurrentUser] = useState(null)
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [systemMessage, setSystemMessage] = useState(null)


  // Real & Mock list state
  const [recentWorkspaces, setRecentWorkspaces] = useState([])
  const [mockActiveWorkspace, setMockActiveWorkspace] = useState(null)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(id)

  // File system state
  const [fileSystem, setFileSystem] = useState({})
  const [currentFolderId, setCurrentFolderId] = useState('root')
  const [activeFileId, setActiveFileId] = useState(null)
  const [newItemName, setNewItemName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [fileSearchQuery, setFileSearchQuery] = useState('')

  // Markdown Editor state
  const [editorContent, setEditorContent] = useState('')
  const [editorTab, setEditorTab] = useState('edit')
  const [activeTab, setActiveTab] = useState('chat')
  const [isChatExpanded, setIsChatExpanded] = useState(true)
  const [isFileExplorerExpanded, setIsFileExplorerExpanded] = useState(true)
  const [isResizing, setIsResizing] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [explorerWidth, setExplorerWidth] = useState(380) // Set default Right Column width a bit wider e.g. 380px
  const [pinnedIds, setPinnedIds] = useState(['readme_md', 'brief_md'])
  const [expandedFolders, setExpandedFolders] = useState({ 'root': true, 'deliverables_folder': true })

  // Results Tab Layout state
  const [layoutSections, setLayoutSections] = useState([])
  const [activeSelectingCell, setActiveSelectingCell] = useState(null) // { sectionId, fileIndex } or null
  const [undisplayMode, setUndisplayMode] = useState(true)
  const [layoutSearchQuery, setLayoutSearchQuery] = useState('')
  const [showLayoutSelector, setShowLayoutSelector] = useState(false)
  const [newLayoutCols, setNewLayoutCols] = useState(1)
  const [activeEditingTextCell, setActiveEditingTextCell] = useState(null) // { sectionId, fileIndex, tempContent } or null
  const [showSectionSettings, setShowSectionSettings] = useState(null) // sectionId or null
  // Mirrors lastRemoteStrRef but as state so the button re-renders when snapshot changes
  const [layoutRemoteSnapshot, setLayoutRemoteSnapshot] = useState('')

  const lastRemoteStrRef = useRef('')

  // Sync tab from URL query params
  useEffect(() => {
    if (tabParam === 'general-chat') {
      setActiveTab('chat')
      setActiveChannel({ type: 'general' })
    } else if (tabParam === 'results') {
      setActiveTab('results')
    } else if (tabParam === 'details') {
      setActiveTab('details')
    } else if (tabParam === 'explorer') {
      setActiveTab('explorer')
    }
  }, [tabParam])

  // Sync layout state when workspace loads or updates from remote database
  useEffect(() => {
    const hasRemoteLayout = workspace?.finalization_layout && Array.isArray(workspace.finalization_layout) && workspace.finalization_layout.length > 0
    const remote = hasRemoteLayout ? workspace.finalization_layout : fileSystem?._layout
    if (remote && !(Array.isArray(remote) && remote.length === 0)) {
      const remoteStr = JSON.stringify(remote)
      if (lastRemoteStrRef.current !== remoteStr) {
        lastRemoteStrRef.current = remoteStr
        setLayoutRemoteSnapshot(remoteStr)
        if (Array.isArray(remote)) {
          setLayoutSections(remote)
        } else if (remote.cols) {
          // Migrate old single grid layout format to flat column-only layout files array
          const cells = remote.cells || {}
          const filesList = []
          for (let r = 0; r < (remote.rows || 1); r++) {
            for (let c = 0; c < (remote.cols || 1); c++) {
              const cell = cells[`${r}-${c}`]
              if (cell) {
                filesList.push(cell)
              }
            }
          }
          setLayoutSections([{
            id: 'migrated-default',
            cols: remote.cols,
            files: filesList
          }])
        } else {
          setLayoutSections([])
        }
      }
    } else {
      // If no remote layout exists yet, check localStorage as fallback
      if (typeof window !== 'undefined' && id) {
        try {
          const savedLayouts = localStorage.getItem(`ws-layouts-v3-${id}`)
          if (savedLayouts && !lastRemoteStrRef.current) {
            setLayoutSections(JSON.parse(savedLayouts))
          } else if (!lastRemoteStrRef.current) {
            setLayoutSections([])
          }
        } catch (e) {
          console.error('Failed to load fallback layouts from localStorage:', e)
        }
      }
    }
  }, [workspace?.finalization_layout, fileSystem?._layout, id])

  // Load pinned IDs from file system whenever it changes
  useEffect(() => {
    if (fileSystem?._pinnedIds && Array.isArray(fileSystem._pinnedIds)) {
      setPinnedIds(fileSystem._pinnedIds)
    }
  }, [fileSystem?._pinnedIds])

  // Save layout helper for local preview
  const saveLayoutLocally = (sections) => {
    if (typeof window !== 'undefined' && id) {
      try {
        localStorage.setItem(`ws-layouts-v3-${id}`, JSON.stringify(sections))
      } catch (e) {
        console.error('Failed to save layouts to localStorage:', e)
      }
    }
  }

  // Add layout section handler
  const handleAddSection = (cols) => {
    const newSection = {
      id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cols: cols,
      files: []
    }
    const updated = [...layoutSections, newSection]
    setLayoutSections(updated)
    saveLayoutLocally(updated)
    setShowLayoutSelector(false)
  }

  // Remove section handler
  const handleRemoveSection = (sectionId) => {
    if (!confirm("Are you sure you want to delete this layout section?")) return
    const updated = layoutSections.filter(s => s.id !== sectionId)
    setLayoutSections(updated)
    saveLayoutLocally(updated)
    if (activeSelectingCell?.sectionId === sectionId) {
      setActiveSelectingCell(null)
    }
  }

  // Section quick column resize handler
  const handleResizeSectionCols = (sectionId, newCols) => {
    const updated = layoutSections.map(s => {
      if (s.id === sectionId) {
        return { ...s, cols: newCols }
      }
      return s
    })
    setLayoutSections(updated)
    saveLayoutLocally(updated)
  }

  // Handle section custom config updates (columns sizing and heights)
  const handleUpdateSectionConfig = (sectionId, config) => {
    const updated = layoutSections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          gridColsTemplate: config.gridColsTemplate !== undefined ? config.gridColsTemplate : s.gridColsTemplate,
          height: config.height !== undefined ? config.height : s.height,
          colSizes: config.colSizes !== undefined ? config.colSizes : s.colSizes
        }
      }
      return s
    })
    setLayoutSections(updated)
    saveLayoutLocally(updated)
  }

  // Add text / markdown card inside grid cell
  const handleAddTextCell = (sectionId, fileIndex) => {
    const updated = layoutSections.map(s => {
      if (s.id === sectionId) {
        const nextFiles = [...s.files]
        nextFiles[fileIndex] = {
          type: 'text',
          content: '### New Text Card\n\nEdit this card to write your deliverable description or design notes using Markdown!'
        }
        return { ...s, files: nextFiles }
      }
      return s
    })
    setLayoutSections(updated)
    saveLayoutLocally(updated)
  }

  // Update text / markdown cell content
  const handleUpdateTextCell = (sectionId, fileIndex, newContent) => {
    const updated = layoutSections.map(s => {
      if (s.id === sectionId) {
        const nextFiles = [...s.files]
        nextFiles[fileIndex] = {
          ...nextFiles[fileIndex],
          type: 'text',
          content: newContent
        }
        return { ...s, files: nextFiles }
      }
      return s
    })
    setLayoutSections(updated)
    saveLayoutLocally(updated)
  }

  // Select / clear file inside grid cell
  const handleSelectCellFile = (sectionId, fileIndex, file) => {
    const updated = layoutSections.map(s => {
      if (s.id === sectionId) {
        const nextFiles = [...s.files]
        nextFiles[fileIndex] = {
          id: file.id,
          name: file.name,
          url: file.url,
          type: file.type
        }
        return { ...s, files: nextFiles }
      }
      return s
    })
    setLayoutSections(updated)
    saveLayoutLocally(updated)
    setActiveSelectingCell(null)
  }

  const handleClearCellFile = (sectionId, fileIndex) => {
    const updated = layoutSections.map(s => {
      if (s.id === sectionId) {
        const nextFiles = s.files.filter((_, idx) => idx !== fileIndex)
        return { ...s, files: nextFiles }
      }
      return s
    })
    setLayoutSections(updated)
    saveLayoutLocally(updated)
  }

  // Update Layout in database
  const handleUpdateLayout = async () => {
    if (!activeWorkspaceId) return

    // Sanitize layout sections: remove any deliverables that exceed the column count
    const sanitizedLayout = layoutSections.map(section => {
      if (section.files && section.files.length > section.cols) {
        return { ...section, files: section.files.slice(0, section.cols) }
      }
      return section
    })

    // Skip DB write if layout hasn't changed from what's already in Supabase
    const currentStr = JSON.stringify(sanitizedLayout)
    if (lastRemoteStrRef.current && lastRemoteStrRef.current === currentStr) {
      setSystemMessage("Layout is already up to date — no changes detected.")
      return
    }

    setLayoutSections(sanitizedLayout)
    saveLayoutLocally(sanitizedLayout)

    setActionLoading(true)
    setError(null)
    setSystemMessage(null)

    try {
      // 1. Try to save directly to the workspaces.finalization_layout column
      const { error: colError } = await supabase
        .from('workspaces')
        .update({
          finalization_layout: sanitizedLayout,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeWorkspaceId)

      if (colError) {
        console.warn("Could not save layout directly to finalization_layout column, falling back to file_system JSON metadata:", colError.message)

        // 2. Fallback to saving under _layout inside the fileSystem column
        const newFs = {
          ...fileSystem,
          _layout: sanitizedLayout
        }
        setFileSystem(newFs)
        localStorage.setItem(`sarena_workspace_files_${activeWorkspaceId}`, JSON.stringify(newFs))
        if (!activeWorkspaceId.startsWith('mock-')) {
          await saveFileSystemToDb(newFs)
        }
      } else {
        // Success — sync the remote ref so subsequent clicks are no-ops
        lastRemoteStrRef.current = currentStr
        setLayoutRemoteSnapshot(currentStr)
        await loadWorkspace()
      }

      setSystemMessage("Workspace layout sections updated successfully.")
    } catch (err) {
      console.error("Failed to update layout sections:", err)
      setError("Failed to update layouts.")
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Layout (delete all layout sections)
  const handleDeleteLayout = async () => {
    if (!activeWorkspaceId) return
    if (!confirm("Are you sure you want to delete ALL layout sections?")) return

    setActionLoading(true)
    setError(null)
    setSystemMessage(null)

    try {
      // 1. Reset database workspaces.finalization_layout column
      const { error: colError } = await supabase
        .from('workspaces')
        .update({
          finalization_layout: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeWorkspaceId)

      // 2. Also clear file_system._layout backup metadata
      const newFs = { ...fileSystem }
      delete newFs._layout
      setFileSystem(newFs)
      localStorage.setItem(`sarena_workspace_files_${activeWorkspaceId}`, JSON.stringify(newFs))
      if (!activeWorkspaceId.startsWith('mock-')) {
        await saveFileSystemToDb(newFs)
      }

      // Reset local states
      setLayoutSections([])
      lastRemoteStrRef.current = ''

      localStorage.removeItem(`ws-layouts-v3-${id}`)

      setSystemMessage("All layouts deleted successfully.")
    } catch (err) {
      console.error("Failed to delete layouts:", err)
      setError("Failed to delete layouts.")
    } finally {
      setActionLoading(false)
    }
  }

  // Chat messages state
  const [messages, setMessages] = useState([])
  const [inputVal, setInputVal] = useState('')
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Multi-room Collaboration states
  const [siblings, setSiblings] = useState([])
  const groupKey = siblings.length > 0 ? siblings.map(s => s.id).sort()[0] : (id || 'default')
  const [initiator, setInitiator] = useState(null)
  const [groupLocked, setGroupLocked] = useState(false)
  const [myPendingRow, setMyPendingRow] = useState(null)
  const [activeChannel, setActiveChannel] = useState({ type: 'general' })

  // Context Menu & File Operations states
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, itemId: null })
  const [clipboard, setClipboard] = useState(null)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [moveItemId, setMoveItemId] = useState(null)
  const [selectedFolderId, setSelectedFolderId] = useState(null)
  const [showReleaseModal, setShowReleaseModal] = useState(false)
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [explorerViewMode, setExplorerViewMode] = useState('directory') // 'directory' or 'tree'

  // Touch Hold Event refs
  const touchTimeoutRef = useRef(null)
  const touchStartPosRef = useRef({ x: 0, y: 0 })
  const contextMenuOpenedAtRef = useRef(0)

  // Host setup editing states
  const [userList, setUserList] = useState([])
  const [isEditingSetup, setIsEditingSetup] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBrief, setEditBrief] = useState('')
  const [editAmount, setEditAmount] = useState(0)
  const [editRevisions, setEditRevisions] = useState(0)
  const [editClients, setEditClients] = useState([])
  const [editDesigners, setEditDesigners] = useState([])
  const [editClientInput, setEditClientInput] = useState('')
  const [editDesignerInput, setEditDesignerInput] = useState('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Automatically set edit budget based on maximum price of the invited designers when editing
    if (isEditingSetup) {
      const invitedDesigners = editDesigners.filter(d => currentUser && d.id !== currentUser.id)
      if (invitedDesigners.length > 0) {
        const maxPrice = Math.max(...invitedDesigners.map(u => u.price_base || 0))
        if (maxPrice > 0) {
          setEditAmount(maxPrice)
        }
      }
    }
  }, [editDesigners, isEditingSetup, currentUser])

  async function loadWorkspace(showGlobalLoading = false) {
    setError(null)
    if (showGlobalLoading || !workspace) {
      setLoading(true)
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?next=/workspace/' + id)
        return
      }
      setCurrentUser(user)

      // Check if mock id
      if (id && id.startsWith('mock-')) {
        const mockTemplates = [
          { id: 'mock-1', amount: 3500000, revisions: 3, revisions_used: 1, brief: 'Create a dark-themed UI landing page for a web3 design agency. We need clean typography (Neue Haas Grotesk) and high-quality 3D mockups. Formats needed: WebP for images, PDF for visual style guides.', status: 'escrow', handshake: true, partnerName: 'Olivia Davis', role: 'UI/UX Designer', avatarSeed: 'olivia', lastMsg: 'I have uploaded the initial concept layout!' },
          { id: 'mock-2', amount: 5000000, revisions: 5, revisions_used: 3, brief: 'Complete visual identity redesign for McWooden Organic Coffee. Requires brand guidelines PDF and high-res package assets.', status: 'escrow', handshake: true, partnerName: 'Liam Carter', role: 'Branding Specialist', avatarSeed: 'liam', lastMsg: 'Working on revision #3 right now.' },
          { id: 'mock-3', amount: 1200000, revisions: 2, revisions_used: 0, brief: 'Minimalist logo design for an AI SaaS start-up named Synthetix. We want a geometric symbol and clean wordmark.', status: 'pending', handshake: false, partnerName: 'Sophia Reed', role: 'Logo Designer', avatarSeed: 'sophia', lastMsg: 'Awaiting initial payment confirmation.' },
          { id: 'mock-4', amount: 8000000, revisions: 6, revisions_used: 6, brief: '3D character modeling and custom textures for a mobile game project. High-res assets required.', status: 'released', handshake: true, partnerName: 'Ethan Hunt', role: '3D Illustrator', avatarSeed: 'ethan', lastMsg: 'All final assets approved!' },
        ]

        const mockWS = mockTemplates.find(t => t.id === id) || mockTemplates[0]
        setWorkspace(mockWS)
        setInitiator({ id: 'mock-client', full_name: 'Mock Client', username: 'mockclient', avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=mockclient' })

        const mockSiblings = [
          {
            id: mockWS.id,
            handshake: mockWS.handshake,
            status: mockWS.status,
            created_by: 'mock-client',
            client_id: 'mock-client',
            creator_id: 'mock-designer',
            creator: { id: 'mock-designer', full_name: mockWS.partnerName, username: mockWS.avatarSeed, avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${mockWS.avatarSeed}` }
          }
        ]

        if (mockWS.id === 'mock-3') {
          mockSiblings.push({
            id: 'mock-sibling-2',
            handshake: true,
            status: 'pending',
            created_by: 'mock-client',
            client_id: 'mock-client',
            creator_id: 'mock-designer-2',
            creator: { id: 'mock-designer-2', full_name: 'Alex Rivera', username: 'alex', avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=alex' }
          })
        }

        setSiblings(mockSiblings)
        setGroupLocked(mockSiblings.some(s => !s.handshake))
        setMyPendingRow(mockWS.handshake ? null : mockSiblings[0])
        setUserList([
          { id: 'mock-designer-2', full_name: 'Alex Rivera', email: 'alex@example.com', role: 'creator', username: 'alex', price_base: 1200000 },
          { id: 'mock-client', full_name: 'Mock Client', email: 'client@example.com', role: 'client', username: 'mockclient', price_base: 0 },
          { id: 'mock-designer', full_name: 'Sophia Reed', email: 'sophia@example.com', role: 'creator', username: 'sophia', price_base: 1500000 },
        ])
        setLoading(false)
        return
      }

      // Fetch primary active workspace details
      const { data, error: fetchError } = await supabase
        .from('workspaces')
        .select(`
          *,
          client:users!client_id (id, full_name, email, avatar_url, username),
          creator:users!creator_id (id, full_name, email, avatar_url, username)
        `)
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        if (!data || fetchError?.code === 'PGRST116') {
          router.push('/dashboard')
          return
        }
        console.error(fetchError)
        setError("Workspace not found or unauthorized.")
        setLoading(false)
        return
      }

      // Restrict access for non-participants (including admins) to view details/chat of this workspace
      const isClient = data.client_id === user.id
      const isCreator = data.creator_id === user.id
      const isInitiator = data.created_by === user.id

      if (!isClient && !isCreator && !isInitiator) {
        setError("Access Denied: You are not a participant in this workspace.")
        setLoading(false)
        return
      }

      setWorkspace(data)

      // Automatically verify payment status in background if pending and client is loading page
      if (data.status === 'pending' && isClient) {
        fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: data.id })
        })
        .then(res => res.json())
        .then(resData => {
          if (resData.success && resData.status === 'escrow') {
            console.log('Payment verified automatically in background!')
            loadWorkspace(false)
          }
        })
        .catch(err => console.log('Auto-payment verification request failed:', err))
      }

      // Fetch initiator profile
      let initiatorProfile = null
      if (data.created_by === data.client_id) {
        initiatorProfile = data.client
      } else if (data.created_by === data.creator_id) {
        initiatorProfile = data.creator
      } else {
        const { data: creatorProfile } = await supabase
          .from('users')
          .select('id, full_name, email, avatar_url, username')
          .eq('id', data.created_by)
          .single()
        initiatorProfile = creatorProfile
      }
      setInitiator(initiatorProfile)

      // Fetch sibling workspaces in the same group (same created_by and title)
      const { data: siblingsList } = await supabase
        .from('workspaces')
        .select(`
          *,
          client:users!client_id (id, full_name, email, avatar_url, username),
          creator:users!creator_id (id, full_name, email, avatar_url, username)
        `)
        .eq('created_by', data.created_by)
        .eq('title', data.title)

      const siblingWorkspaces = siblingsList || [data]
      setSiblings(siblingWorkspaces)

      // Check if locked: pending payment or awaiting handshake
      const isLocked = data.status === 'pending' || siblingWorkspaces.some(s => !s.handshake)
      setGroupLocked(isLocked)

      // Find if current user has a pending handshake row
      const pendingRow = siblingWorkspaces.find(s => {
        const isInvitee = s.created_by === s.client_id ? s.creator_id === user.id : s.client_id === user.id
        return isInvitee && !s.handshake
      })
      setMyPendingRow(pendingRow || null)

      // Fetch users list for tagging dropdown
      try {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, email, role, username, price_base')
          .neq('id', user.id)
        setUserList(usersData || [])
      } catch (e) {
        console.error(e)
      }

      setLoading(false)

      // Fetch recent user workspaces to show in left sidebar (up to 5)
      try {
        const { data: workspacesList } = await supabase
          .from('workspaces')
          .select(`
            id,
            amount,
            status,
            handshake,
            client:users!client_id (id, full_name, email, avatar_url),
            creator:users!creator_id (id, full_name, email, avatar_url, username)
          `)
          .or(`client_id.eq.${user.id},creator_id.eq.${user.id}`)
          .order('updated_at', { ascending: false })
          .limit(5)

        const list = workspacesList || []
        const mockTemplates = [
          { id: 'mock-1', amount: 3500000, revisions: 3, revisions_used: 1, brief: 'Create a dark-themed UI landing page for a web3 design agency. We need clean typography (Neue Haas Grotesk) and high-quality 3D mockups. Formats needed: WebP for images, PDF for visual style guides.', status: 'escrow', handshake: true, partnerName: 'Olivia Davis', role: 'UI/UX Designer', avatarSeed: 'olivia', lastMsg: 'I have uploaded the initial concept layout!' },
          { id: 'mock-2', amount: 5000000, revisions: 5, revisions_used: 3, brief: 'Complete visual identity redesign for McWooden Organic Coffee. Requires brand guidelines PDF and high-res package assets.', status: 'escrow', handshake: true, partnerName: 'Liam Carter', role: 'Branding Specialist', avatarSeed: 'liam', lastMsg: 'Working on revision #3 right now.' },
          { id: 'mock-3', amount: 1200000, revisions: 2, revisions_used: 0, brief: 'Minimalist logo design for an AI SaaS start-up named Synthetix. We want a geometric symbol and clean wordmark.', status: 'pending', handshake: false, partnerName: 'Sophia Reed', role: 'Logo Designer', avatarSeed: 'sophia', lastMsg: 'Awaiting initial payment confirmation.' },
          { id: 'mock-4', amount: 8000000, revisions: 6, revisions_used: 6, brief: '3D character modeling and custom textures for a mobile game project. High-res assets required.', status: 'released', handshake: true, partnerName: 'Ethan Hunt', role: '3D Illustrator', avatarSeed: 'ethan', lastMsg: 'All final assets approved!' },
        ]

        let finalWorkspaces = []

        list.forEach(ws => {
          const isClientWs = user.id === ws.client_id
          const partnerName = isClientWs
            ? ws.creator?.full_name || 'Designer'
            : ws.client?.full_name || 'Client'
          const role = isClientWs ? 'Designer' : 'Client'
          const avatarSeed = isClientWs
            ? ws.creator?.username || ws.id
            : ws.client?.full_name || ws.id

          finalWorkspaces.push({
            id: ws.id,
            amount: ws.amount,
            status: ws.status,
            handshake: ws.handshake,
            partnerName,
            role,
            avatarSeed,
            lastMsg: ws.status === 'released' ? 'Workspace finalized' : 'Escrow active',
            isReal: true
          })
        })

        let mockIndex = 0
        while (finalWorkspaces.length < 5 && mockIndex < mockTemplates.length) {
          if (finalWorkspaces.every(item => item.id !== mockTemplates[mockIndex].id)) {
            finalWorkspaces.push({
              ...mockTemplates[mockIndex],
              isReal: false
            })
          }
          mockIndex++
        }

        setRecentWorkspaces(finalWorkspaces.slice(0, 5))
      } catch (e) {
        console.error("Error fetching recent workspaces", e)
      }
    } catch (e) {
      console.error("Failed to load workspace data:", e)
      const errorMsg = e?.message || String(e)
      const isFetchError = errorMsg.toLowerCase().includes('fetch') || errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('typeerror')
      setError(isFetchError ? "Failed to fetch workspace. Please check your internet connection and try again." : errorMsg)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      setMockActiveWorkspace(null)
      setActiveWorkspaceId(id)
      loadWorkspace()
    }
  }, [id])

  useEffect(() => {
    if (!id || id.startsWith('mock-')) return

    // Subscribe to realtime updates on workspaces table for synchronization
    const channel = supabase
      .channel(`workspace-realtime-page-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspaces'
        },
        (payload) => {
          console.log('Realtime workspace update received on details page:', payload)
          if (payload.eventType === 'DELETE' && payload.old && payload.old.id === id) {
            router.push('/dashboard')
            return
          }
          loadWorkspace(false)
        }
      )
      .subscribe((status) => {
        console.log(`Realtime workspace channel status for ${id}:`, status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const activeWS = mockActiveWorkspace || workspace;

  const loadFileSystemFromDb = async () => {
    if (!activeWorkspaceId) return null
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('file_system')
        .eq('id', activeWorkspaceId)
        .single()

      if (!error && data && data.file_system) {
        return data.file_system
      }
    } catch (e) {
      console.error("Error loading filesystem from database:", e)
    }
    return null
  }

  const saveFileSystemToDb = async (fs) => {
    if (!activeWorkspaceId) return
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ file_system: fs, updated_at: new Date().toISOString() })
        .eq('id', activeWorkspaceId)
      if (error) {
        console.error("Error saving filesystem to database:", error.message)
      }
    } catch (e) {
      console.error("Error saving filesystem to database:", e)
    }
  }

  const loadChatFromDb = async () => {
    if (!activeWorkspaceId || !currentUser || !currentUser.id) return
    try {
      let query = supabase
        .from('workspace_chats')
        .select(`
          *,
          sender:users!sender_id(full_name, avatar_url)
        `)
        .eq('workspace_id', activeWorkspaceId)

      if (activeChannel.type === 'general') {
        query = query.eq('channel_type', 'general')
      } else {
        query = query
          .eq('channel_type', 'dm')
          .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${activeChannel.userId}),and(sender_id.eq.${activeChannel.userId},recipient_id.eq.${currentUser.id})`)
      }

      const { data, error } = await query.order('created_at', { ascending: true })
      if (error) throw error

      if (data && data.length > 0) {
        const mappedMsgs = data.map((msg) => ({
          id: msg.id,
          sender: msg.sender_id === currentUser.id ? 'me' : 'partner',
          senderId: msg.sender_id,
          senderName: msg.sender?.full_name || 'Partner',
          text: msg.message,
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        }))
        setMessages(mappedMsgs)
      } else {
        setMessages(getDefaultMessagesForChannel(activeChannel))
      }
    } catch (e) {
      console.error("Error loading chat from database:", e)
    }
  }

  // File manager initialization
  useEffect(() => {
    if (!activeWorkspaceId || !activeWS) return

    if (activeWorkspaceId.startsWith('mock-')) {
      const fsKey = `sarena_workspace_files_${activeWorkspaceId}`
      const savedFs = localStorage.getItem(fsKey)
      if (savedFs) {
        try {
          setFileSystem(JSON.parse(savedFs))
        } catch (e) {
          initializeDefaultFiles(activeWS)
        }
      } else {
        initializeDefaultFiles(activeWS)
      }
      setCurrentFolderId('root')
      setActiveFileId(null)
      return
    }

    async function loadFs() {
      const fs = await loadFileSystemFromDb()
      if (fs) {
        // Ensure deliverables_folder exists
        let delivFolderKey = Object.keys(fs).find(k => 
          k === 'deliverables_folder' || (fs[k]?.type === 'folder' && fs[k]?.name?.toLowerCase() === 'deliverables')
        )
        if (!delivFolderKey) {
          delivFolderKey = 'deliverables_folder'
          fs['deliverables_folder'] = {
            id: 'deliverables_folder',
            name: 'Deliverables',
            type: 'folder',
            parentId: 'root',
            children: []
          }
          if (fs['root']) {
            fs['root'] = {
              ...fs['root'],
              children: [...(fs['root'].children || []).filter(c => c !== 'deliverables_folder'), 'deliverables_folder']
            }
          }
        }

        // Migrate any deliverable file stranded in root into deliverables_folder
        Object.keys(fs).forEach(k => {
          const item = fs[k]
          if (item && item.type === 'file' && (item.isDeliverable || item.url === activeWS?.deliverable_file) && item.parentId === 'root') {
            item.parentId = delivFolderKey
            item.isDeliverable = true
            if (fs['root']?.children) {
              fs['root'].children = fs['root'].children.filter(id => id !== k)
            }
            if (fs[delivFolderKey] && !fs[delivFolderKey].children?.includes(k)) {
              fs[delivFolderKey].children = [...(fs[delivFolderKey].children || []), k]
            }
          }
        })

        // If activeWS has a deliverable_file but no file item exists in fs, add it
        if (activeWS?.deliverable_file) {
          const hasFile = Object.values(fs).some(f => f?.url === activeWS.deliverable_file)
          if (!hasFile && fs[delivFolderKey]) {
            const delivFileId = `deliv_${Date.now()}`
            const isPdf = activeWS.deliverable_file.toLowerCase().endsWith('.pdf')
            fs[delivFileId] = {
              id: delivFileId,
              name: isPdf ? 'deliverable.pdf' : 'deliverable.webp',
              type: 'file',
              fileType: isPdf ? 'pdf' : 'webp',
              parentId: delivFolderKey,
              isDeliverable: true,
              url: activeWS.deliverable_file,
              size: 500 * 1024
            }
            fs[delivFolderKey].children = [...(fs[delivFolderKey].children || []), delivFileId]
          }
        }

        setFileSystem(fs)
      } else {
        const fsKey = `sarena_workspace_files_${activeWorkspaceId}`
        const savedFs = localStorage.getItem(fsKey)
        if (savedFs) {
          try {
            const parsed = JSON.parse(savedFs)
            setFileSystem(parsed)
            await saveFileSystemToDb(parsed)
          } catch (e) {
            await initializeDefaultFiles(activeWS)
          }
        } else {
          await initializeDefaultFiles(activeWS)
        }
      }
      setCurrentFolderId('root')
      setActiveFileId(null)
    }
    loadFs()
  }, [activeWorkspaceId, activeWS])

  const updateFileSystem = async (newFs) => {
    setFileSystem(newFs)
    if (activeWorkspaceId) {
      localStorage.setItem(`sarena_workspace_files_${activeWorkspaceId}`, JSON.stringify(newFs))
      if (!activeWorkspaceId.startsWith('mock-')) {
        await saveFileSystemToDb(newFs)
      }
    }
  }

  const initializeDefaultFiles = async (ws) => {
    const briefContent = ws.brief || "No brief was written. Please collaborate via direct communication.";
    const seed = {
      'root': {
        id: 'root',
        name: 'Root',
        type: 'folder',
        children: ['readme_md', 'brief_md', 'deliverables_folder']
      },
      'readme_md': {
        id: 'readme_md',
        name: 'workspace_guide.md',
        type: 'file',
        fileType: 'md',
        parentId: 'root',
        content: `# Workspace Guide\n\nWelcome to **Sarena Design Workspace**! This portal enables clients and designers to collaborate in real-time.\n\n### Interactive Features:\n1. **File Manager**: Double-click folders to navigate. Single-click files to open them.\n2. **Markdown Editor**: Click any \`.md\` file to edit and save changes in the right-hand panel.\n3. **Real-time Uploads**: Upload \`.pdf\` and image files (converted to WebP, 10 MB limit).\n4. **Storage Bar**: See your active storage footprint update dynamically.\n\nUse the chat on the right to correspond with your partner.`,
        size: 600
      },
      'brief_md': {
        id: 'brief_md',
        name: 'creative_brief.md',
        type: 'file',
        fileType: 'md',
        parentId: 'root',
        content: `# Creative Brief\n\nBelow are the details and requirements specified for this contract:\n\n* **Agreed Amount:** Rp ${(ws.amount || 0).toLocaleString('id-ID')}\n* **Allowed Revisions:** ${ws.revisions || 0}\n\n### Requirements:\n${briefContent}`,
        size: 320
      },
      'deliverables_folder': {
        id: 'deliverables_folder',
        name: 'Deliverables',
        type: 'folder',
        parentId: 'root',
        children: ['sample_layout_webp']
      },
      'sample_layout_webp': {
        id: 'sample_layout_webp',
        name: 'concept_layout.webp',
        type: 'file',
        fileType: 'webp',
        parentId: 'deliverables_folder',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        size: 450 * 1024
      }
    }
    setFileSystem(seed)
    localStorage.setItem(`sarena_workspace_files_${ws.id}`, JSON.stringify(seed))
    if (ws.id && !ws.id.startsWith('mock-')) {
      await saveFileSystemToDb(seed)
    }
  }

  const getDefaultMessagesForChannel = (channel) => {
    const activeWS = workspace || {}
    const isGeneral = channel.type === 'general'

    if (isGeneral) {
      if (groupKey && !groupKey.startsWith('mock-')) {
        return [
          {
            id: 1,
            sender: 'system',
            text: `Welcome to the General Chat Room for workspace "${activeWS.title || 'Studio'}". All participants are in this room.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read'
          }
        ]
      }
      return [
        {
          id: 1,
          sender: 'system',
          text: `Welcome to the General Chat Room for workspace "${activeWS.title || 'Studio'}". All participants are in this room.`,
          time: '10:30 AM',
          status: 'read'
        },
        {
          id: 2,
          sender: 'partner',
          senderName: initiator?.full_name || 'System',
          text: `Hello everyone! Glad we got this workspace set up. Let's use this general channel for team communication and files.`,
          time: '10:32 AM',
          status: 'read'
        }
      ]
    } else {
      const partner = uniqueParticipants.find(p => p.id === channel.userId) || initiator || {}
      return [
        {
          id: 1,
          sender: 'system',
          text: `This is the start of your direct messaging history with ${partner.full_name || 'Partner'}. Messages are private to you two.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        }
      ]
    }
  }

  // Find other participants (excluding current user)
  const invitees = siblings.map(sibling => {
    if (sibling.created_by === sibling.client_id) {
      return sibling.creator
    } else {
      return sibling.client
    }
  }).filter(Boolean)

  // Deduplicate invitees by ID and filter out current user
  const uniqueParticipants = []
  const participantIds = new Set()

  if (initiator && initiator.id !== currentUser?.id) {
    uniqueParticipants.push(initiator)
    participantIds.add(initiator.id)
  }

  invitees.forEach(inv => {
    if (inv && inv.id !== currentUser?.id && !participantIds.has(inv.id)) {
      uniqueParticipants.push(inv)
      participantIds.add(inv.id)
    }
  })

  // Scoped chat loading
  useEffect(() => {
    if (!activeWorkspaceId || !currentUser || !currentUser.id) return

    if (activeWorkspaceId.startsWith('mock-')) {
      const chatKey = activeChannel.type === 'general'
        ? `sarena_workspace_chat_${groupKey}_general`
        : `sarena_workspace_chat_${groupKey}_dm_${activeChannel.userId}`

      const savedChat = localStorage.getItem(chatKey)
      if (savedChat) {
        try {
          setMessages(JSON.parse(savedChat))
        } catch (e) {
          setMessages(getDefaultMessagesForChannel(activeChannel))
        }
      } else {
        setMessages(getDefaultMessagesForChannel(activeChannel))
      }
      return
    }

    loadChatFromDb()
  }, [activeWorkspaceId, activeChannel, currentUser])

  // Real-time polling for updates (3s interval) for real workspaces
  useEffect(() => {
    if (!activeWorkspaceId || activeWorkspaceId.startsWith('mock-') || !currentUser || !currentUser.id || error) return

    const interval = setInterval(async () => {
      // 1. Poll workspace status and layout updates
      try {
        const { data: wsUpdate, error: pollError } = await supabase
          .from('workspaces')
          .select('status, handshake, finalization_layout')
          .eq('id', activeWorkspaceId)
          .single()
        if (wsUpdate && !pollError) {
          let needsReload = false
          setWorkspace(prev => {
            if (!prev) return wsUpdate
            const statusChanged = prev.status !== wsUpdate.status
            const handshakeChanged = prev.handshake !== wsUpdate.handshake
            const layoutChanged = JSON.stringify(prev.finalization_layout) !== JSON.stringify(wsUpdate.finalization_layout)
            if (statusChanged || handshakeChanged) {
              needsReload = true
            }
            if (statusChanged || handshakeChanged || layoutChanged) {
              return {
                ...prev,
                status: wsUpdate.status,
                handshake: wsUpdate.handshake,
                finalization_layout: wsUpdate.finalization_layout
              }
            }
            return prev
          })
          if (needsReload) {
            loadWorkspace()
          }
        }
      } catch (err) {
        console.error("Error polling workspace details:", err)
      }

      // 2. Poll file system
      const fs = await loadFileSystemFromDb()
      if (fs) {
        setFileSystem(prevFs => {
          const prevStr = JSON.stringify(prevFs)
          const nextStr = JSON.stringify(fs)
          return prevStr === nextStr ? prevFs : fs
        })
      }

      // 3. Poll chat messages
      await loadChatFromDb()
    }, 3000)

    return () => clearInterval(interval)
  }, [activeWorkspaceId, activeChannel, currentUser, workspace, groupLocked, error])


  const handleHandshake = async () => {
    setActionLoading(true)
    setSystemMessage(null)
    setError(null)

    try {
      if (id && id.startsWith('mock-')) {
        // Mock handshake accept simulation
        const updatedMock = { ...workspace, handshake: true }
        setWorkspace(updatedMock)

        const updatedSiblings = siblings.map(s => {
          if (s.id === workspace.id) {
            return { ...s, handshake: true }
          }
          return s
        })
        setSiblings(updatedSiblings)
        setGroupLocked(updatedSiblings.some(s => !s.handshake))
        setMyPendingRow(null)
        setSystemMessage("Workspace invitation accepted! Let's get to work.")
        return
      }

      // If the user is an invitee (myPendingRow exists), accept THEIR specific row.
      // Otherwise (designer accepting a client's proposal), use the primary workspace id.
      const targetId = myPendingRow ? myPendingRow.id : workspace.id
      const res = await fetch('/api/workspace/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: targetId })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setSystemMessage(data.message || "Proyek berhasil disetujui! Notifikasi pembayaran telah dikirim ke klien.")
      await loadWorkspace()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectProject = async () => {
    if (!confirm("Apakah Anda yakin ingin membatalkan / menolak proyek ini? Workspace tidak akan dibuat dan notifikasi pembatalan akan dikirimkan ke Inbox pihak lain.")) return
    setActionLoading(true)
    setError(null)
    setSystemMessage(null)

    try {
      const res = await fetch('/api/workspace/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace.id })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setSystemMessage("Proyek telah dibatalkan/ditolak. Notifikasi telah dikirimkan ke pihak lain. Mengalihkan ke dashboard...")
      setTimeout(() => {
        router.push('/dashboard')
      }, 1200)
    } catch (err) {
      console.error(err)
      setError(err.message)
      setActionLoading(false)
    }
  }

  // Host setup editing & cancellation functions
  const handleStartEdit = () => {
    setEditTitle(workspace.title || '')
    setEditBrief(workspace.brief || '')
    setEditAmount(workspace.amount || 0)
    setEditRevisions(workspace.revisions || 3)

    const currentClients = []
    const currentDesigners = []
    const clientIds = new Set()
    const designerIds = new Set()

    siblings.forEach(s => {
      if (s.client && !clientIds.has(s.client.id)) {
        currentClients.push(s.client)
        clientIds.add(s.client.id)
      }
      if (s.creator && !designerIds.has(s.creator.id)) {
        currentDesigners.push(s.creator)
        designerIds.add(s.creator.id)
      }
    })

    setEditClients(currentClients)
    setEditDesigners(currentDesigners)
    setIsEditingSetup(true)
  }

  const handleAddEditClient = (inputValue) => {
    setError(null)
    const cleaned = inputValue.trim().replace(/^@/, '')
    if (!cleaned) return
    if (editClients.length >= 5) {
      setError("Maximum of 5 clients allowed.")
      return
    }
    const found = userList.find(
      u => (u.username && u.username.toLowerCase() === cleaned.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === cleaned.toLowerCase())
    )
    if (!found) {
      setError(`Client "${inputValue}" not found.`)
      return
    }
    if (editClients.some(u => u.id === found.id)) {
      setError("Client is already added.")
      return
    }
    setEditClients([...editClients, found])
    setEditClientInput('')
  }

  const handleRemoveEditClient = (clientId) => {
    if (workspace && clientId === workspace.created_by) {
      setError("You cannot remove the initiator from the workspace.")
      return
    }
    setEditClients(editClients.filter(c => c.id !== clientId))
  }

  const handleAddEditDesigner = (inputValue) => {
    setError(null)
    const cleaned = inputValue.trim().replace(/^@/, '')
    if (!cleaned) return
    if (editDesigners.length >= 5) {
      setError("Maximum of 5 designers allowed.")
      return
    }
    const found = userList.find(
      u => (u.username && u.username.toLowerCase() === cleaned.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === cleaned.toLowerCase())
    )
    if (!found) {
      setError(`Designer "${inputValue}" not found.`)
      return
    }
    if (editDesigners.some(u => u.id === found.id)) {
      setError("Designer is already added.")
      return
    }
    setEditDesigners([...editDesigners, found])
    setEditDesignerInput('')
  }

  const handleRemoveEditDesigner = (designerId) => {
    if (workspace && designerId === workspace.created_by) {
      setError("You cannot remove the initiator from the workspace.")
      return
    }
    setEditDesigners(editDesigners.filter(d => d.id !== designerId))
  }

  const handleSaveEdit = async () => {
    setError(null)
    setSystemMessage(null)
    if (!editTitle.trim()) {
      setError("Please provide a project title.")
      return
    }
    if (!editBrief.trim()) {
      setError("Please provide a workspace brief/description.")
      return
    }
    if (editClients.length === 0) {
      setError("Please add at least one client.")
      return
    }
    if (editDesigners.length === 0) {
      setError("Please add at least one designer.")
      return
    }

    setActionLoading(true)

    try {
      if (id && id.startsWith('mock-')) {
        const updatedWS = {
          ...workspace,
          title: editTitle.trim(),
          brief: editBrief.trim(),
          amount: parseInt(editAmount, 10),
          revisions: parseInt(editRevisions, 10)
        }
        setWorkspace(updatedWS)

        const newSiblings = []
        editClients.forEach(c => {
          editDesigners.forEach(d => {
            newSiblings.push({
              id: c.id === initiator.id && d.id === 'mock-designer' ? workspace.id : `mock-sibling-${Math.random()}`,
              handshake: c.id === initiator.id && d.id === 'mock-designer' ? workspace.handshake : true,
              status: 'pending',
              created_by: workspace.created_by,
              client_id: c.id,
              creator_id: d.id,
              client: c,
              creator: d
            })
          })
        })

        setSiblings(newSiblings)
        setGroupLocked(newSiblings.some(s => !s.handshake))
        setIsEditingSetup(false)
        setSystemMessage("Workspace setup updated successfully! (Mock)")
        setTimeout(() => setSystemMessage(null), 3000)
        return
      }

      const res = await fetch('/api/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdBy: workspace.created_by,
          originalTitle: workspace.title,
          clients: editClients,
          designers: editDesigners,
          title: editTitle.trim(),
          brief: editBrief.trim(),
          amount: parseInt(editAmount, 10),
          revisions: parseInt(editRevisions, 10)
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setSystemMessage("Workspace setup updated successfully!")
      setIsEditingSetup(false)
      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to update workspace configuration.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelWorkspace = async () => {
    if (!window.confirm("Are you sure you want to cancel this workspace? This will delete all pending invitation channels and configuration terms.")) {
      return
    }

    setActionLoading(true)
    setError(null)
    setSystemMessage(null)

    try {
      if (id && id.startsWith('mock-')) {
        setSystemMessage("Workspace cancelled successfully! (Mock)")
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
        return
      }

      const res = await fetch('/api/workspace', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdBy: workspace.created_by,
          title: workspace.title
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setSystemMessage("Workspace cancelled successfully. Redirecting to dashboard...")
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to cancel workspace.")
      setActionLoading(false)
    }
  }

  const handleJoinProject = async () => {
    setActionLoading(true)
    setError(null)
    setSystemMessage(null)

    try {
      const isCreatorMissing = !workspace.creator_id
      const roleToJoin = isCreatorMissing ? 'creator' : 'client'

      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .single()

      if (isCreatorMissing && userProfile?.role !== 'creator') {
        throw new Error("You must be registered as a Designer to join this slot.")
      }
      if (!isCreatorMissing && userProfile?.role !== 'client') {
        throw new Error("You must be registered as a Client to join this slot.")
      }

      const updatePayload = {
        updated_at: new Date().toISOString()
      }
      if (roleToJoin === 'client') {
        updatePayload.client_id = currentUser.id
      } else {
        updatePayload.creator_id = currentUser.id
      }

      const { error: updateError } = await supabase
        .from('workspaces')
        .update(updatePayload)
        .eq('id', workspace.id)

      if (updateError) throw updateError

      setSystemMessage(`Successfully joined this project as ${roleToJoin}!`)
      await loadWorkspace()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleFundProject = async () => {
    setActionLoading(true)
    setError(null)
    setSystemMessage(null)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace.id })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      if (data.checkout_url) {
        window.location.href = data.checkout_url
      }
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to generate payment invoice.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerifyPayment = async () => {
    setActionLoading(true)
    setError(null)
    setSystemMessage(null)

    try {
      const res = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace.id })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      if (data.success && data.status === 'escrow') {
        setSystemMessage(data.message || "Payment verified successfully!")
        await loadWorkspace()
      } else {
        setError(data.message || "Payment is still pending verification.")
      }
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to verify payment status.")
    } finally {
      setActionLoading(false)
    }
  }


  const handleRequestRevision = async (notes = '') => {
    if (workspace.revisions_used >= workspace.revisions) {
      setError("Batas kuota revisi telah habis.")
      return
    }

    setActionLoading(true)
    setError(null)
    setSystemMessage(null)
    setShowRevisionModal(false)

    try {
      const nextRevNumber = (workspace.revisions_used || 0) + 1

      // 1. Update revisions_used in workspace (keep deliverable_file so client/designer can reference it)
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({
          revisions_used: nextRevNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', workspace.id)

      if (updateError) throw updateError

      // 2. Post official revision note into workspace chat
      const chatNote = `🔄 PERMINTAAN REVISI RESMI #${nextRevNumber} (Sisa Kuota: ${Math.max(0, workspace.revisions - nextRevNumber)} kali)\n\nCatatan Perbaikan dari Klien:\n"${(notes || revisionNotes).trim() || 'Mohon tinjau kembali hasil karya sesuai arahan brief.'}"`

      await supabase.from('workspace_chats').insert({
        workspace_id: workspace.id,
        channel_type: 'general',
        sender_id: currentUser?.id,
        message: chatNote
      })

      setSystemMessage(`Permintaan revisi #${nextRevNumber} berhasil diajukan! Catatan revisi telah dikirimkan ke Chat Workspace.`)
      setRevisionNotes('')
      await loadWorkspace()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveRelease = async () => {
    setActionLoading(true)
    setError(null)
    setSystemMessage(null)
    setShowReleaseModal(false)

    try {
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({ status: 'released', updated_at: new Date().toISOString() })
        .eq('id', workspace.id)

      if (updateError) throw updateError

      setSystemMessage("Persetujuan desain berhasil! Dana Escrow telah dicairkan ke desainer dan proyek telah selesai.")
      await loadWorkspace()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelRefund = async () => {
    if (!window.confirm("Apakah Anda yakin ingin mengajukan pengembalian dana (refund) dan membatalkan transaksi escrow ini? Status proyek akan diubah menjadi Refunded dan proyek tidak akan dilanjutkan.")) {
      return
    }

    setActionLoading(true)
    setError(null)
    setSystemMessage(null)

    try {
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', workspace.id)

      if (updateError) throw updateError

      // Post notice into workspace chat
      try {
        await supabase.from('workspace_chats').insert({
          workspace_id: workspace.id,
          channel_type: 'general',
          sender_id: currentUser?.id,
          message: `⚠️ PEMBERITAHUAN ESCROW: Klien telah mengajukan pembatalan/pengembalian dana (Refund). Transaksi dihentikan dan status kini Refunded.`
        })
      } catch (e) {
        console.warn("Failed to post refund chat notice", e)
      }

      setSystemMessage("Transaksi escrow telah dibatalkan dan status berhasil diubah ke Refunded.")
      await loadWorkspace()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSelectDeliverable = async (fileUrl) => {
    if (!fileUrl) return

    setActionLoading(true)
    setError(null)
    setSystemMessage(null)

    try {
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({ deliverable_file: fileUrl, updated_at: new Date().toISOString() })
        .eq('id', workspace.id)

      if (updateError) throw updateError

      setSystemMessage("Project deliverable selected successfully.")
      await loadWorkspace()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }



  // Custom File Manager operations
  const calculateStorageUsed = (fs) => {
    return Object.values(fs).reduce((acc, item) => {
      if (item.type === 'file' && item.size) {
        return acc + item.size
      }
      return acc;
    }, 0)
  }

  const formatSize = (bytes) => {
    if (bytes === undefined || bytes === null) return ''
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getBreadcrumbs = () => {
    const crumbs = []
    let currId = currentFolderId
    while (currId) {
      const node = fileSystem[currId]
      if (!node) break
      crumbs.unshift(node)
      currId = node.parentId
    }
    return crumbs
  }

  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      setCurrentFolderId(item.id)
    } else {
      setActiveFileId(item.id)
      if (item.fileType === 'md') {
        setEditorContent(item.content || '')
        setEditorTab('preview')
      }
    }
  }

  const handleCreateFolder = (e) => {
    e.preventDefault()
    const name = newItemName.trim()
    if (!name) {
      setIsCreatingFolder(false)
      return
    }
    const id = `folder_${Math.random().toString(36).substring(2, 9)}`
    const newFs = {
      ...fileSystem,
      [currentFolderId]: {
        ...fileSystem[currentFolderId],
        children: [...(fileSystem[currentFolderId].children || []), id]
      },
      [id]: {
        id,
        name,
        type: 'folder',
        parentId: currentFolderId,
        children: []
      }
    }
    updateFileSystem(newFs)
    setIsCreatingFolder(false)
    setNewItemName('')
  }

  const handleCreateFile = (e) => {
    e.preventDefault()
    let name = newItemName.trim()
    if (!name) {
      setIsCreatingFile(false)
      return
    }
    if (!name.endsWith('.md')) {
      name += '.md'
    }
    const id = `file_${Math.random().toString(36).substring(2, 9)}`
    const newFs = {
      ...fileSystem,
      [currentFolderId]: {
        ...fileSystem[currentFolderId],
        children: [...(fileSystem[currentFolderId].children || []), id]
      },
      [id]: {
        id,
        name,
        type: 'file',
        fileType: 'md',
        parentId: currentFolderId,
        content: `# ${name.replace('.md', '')}\n\nStart writing here...`,
        size: 25
      }
    }
    updateFileSystem(newFs)
    setIsCreatingFile(false)
    setNewItemName('')
  }

  const handleDeleteNode = (nodeId) => {
    const newFs = { ...fileSystem }

    const deleteRecursive = (id) => {
      const node = newFs[id]
      if (!node) return
      if (node.type === 'folder' && node.children) {
        node.children.forEach(childId => deleteRecursive(childId))
      }
      delete newFs[id]
    }

    const parentId = fileSystem[nodeId]?.parentId
    if (parentId && newFs[parentId]) {
      newFs[parentId] = {
        ...newFs[parentId],
        children: newFs[parentId].children.filter(childId => childId !== nodeId)
      }
    }

    deleteRecursive(nodeId)

    if (activeFileId === nodeId) {
      setActiveFileId(null)
    }

    updateFileSystem(newFs)
  }

  const proceedWithUpload = async (file, isDeliverable = false) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isWebp = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp')
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')

    // Capture the original filesystem state in case we need to roll back on failure
    const originalFs = { ...fileSystem }

    // Target folder determination: if uploading deliverable or inside deliverables folder, put into 'Deliverables' folder!
    let targetFolder = currentFolderId || 'root'
    const isTargetDeliverables = 
      isDeliverable || 
      targetFolder === 'deliverables_folder' || 
      originalFs[targetFolder]?.name?.toLowerCase() === 'deliverables' ||
      originalFs[targetFolder]?.parentId === 'deliverables_folder'

    const isCreatorWs = currentUser?.id === workspace?.creator_id
    if (!isCreatorWs && isTargetDeliverables) {
      setError("Hanya desainer yang dapat mengunggah file ke folder Deliverables.")
      setTimeout(() => setError(null), 4000)
      return
    }

    if (isTargetDeliverables) {
      // Find or create 'deliverables_folder'
      const existingDelivKey = Object.keys(originalFs).find(k => 
        k === 'deliverables_folder' || (originalFs[k]?.type === 'folder' && originalFs[k]?.name?.toLowerCase() === 'deliverables')
      )
      if (existingDelivKey) {
        targetFolder = existingDelivKey
      } else {
        targetFolder = 'deliverables_folder'
        originalFs['deliverables_folder'] = {
          id: 'deliverables_folder',
          name: 'Deliverables',
          type: 'folder',
          parentId: 'root',
          children: []
        }
        if (originalFs['root']) {
          originalFs['root'] = {
            ...originalFs['root'],
            children: [...(originalFs['root'].children || []).filter(c => c !== 'deliverables_folder'), 'deliverables_folder']
          }
        }
      }
    }

    if (!originalFs[targetFolder]) {
      targetFolder = 'root'
    }

    // Generate final ID
    const id = `file_${Math.random().toString(36).substring(2, 9)}`

    // Determine expected type parameter
    const fileType = isPdf ? 'pdf' : isWebp ? 'webp' : 'png'

    // Insert the temporary loading node into local state (do NOT save to database yet)
    const tempFs = {
      ...originalFs,
      [targetFolder]: {
        ...originalFs[targetFolder],
        children: [...(originalFs[targetFolder].children || []), id]
      },
      [id]: {
        id,
        name: file.name,
        type: 'file',
        fileType,
        parentId: targetFolder,
        size: file.size,
        isUploading: true,
        isDeliverable: isDeliverable,
        url: ''
      }
    }
    setFileSystem(tempFs)

    setUploading(true)
    setError(null)
    setSystemMessage(null)

    try {
      // Perform size limit check
      const currentUsed = calculateStorageUsed(originalFs)
      if (currentUsed + file.size > 10 * 1024 * 1024) {
        throw new Error("Exceeds total workspace storage limit of 10 MB.")
      }

      let publicUrl = null

      if (!mockActiveWorkspace) {
        const fileExt = isPdf ? 'pdf' : isWebp ? 'webp' : 'png'
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
        const filePath = `deliverables/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('workspaces')
          .upload(filePath, file)

        if (!uploadError) {
          const { data: { publicUrl: url } } = supabase.storage
            .from('workspaces')
            .getPublicUrl(filePath)
          publicUrl = url
        } else {
          console.warn("Storage upload failed, falling back to local Object URL preview:", uploadError.message)
        }
      }

      const fileUrl = publicUrl || URL.createObjectURL(file)

      // Construct final filesystem and save it (writes to Supabase DB / localStorage)
      const finalFs = {
        ...originalFs,
        [targetFolder]: {
          ...originalFs[targetFolder],
          children: [...(originalFs[targetFolder].children || []), id]
        },
        [id]: {
          id,
          name: file.name,
          type: 'file',
          fileType,
          parentId: targetFolder,
          size: file.size,
          isDeliverable: isTargetDeliverables,
          url: fileUrl
        }
      }

      await updateFileSystem(finalFs)
      setSystemMessage(isTargetDeliverables ? "Deliverables berhasil diunggah ke folder Deliverables!" : "File uploaded successfully!")
      setTimeout(() => setSystemMessage(null), 3000)

      const isCreatorWs = currentUser?.id === workspace?.creator_id
      if (isTargetDeliverables && !mockActiveWorkspace && isCreatorWs) {
        await supabase
          .from('workspaces')
          .update({ deliverable_file: fileUrl, updated_at: new Date().toISOString() })
          .eq('id', workspace.id)
        await loadWorkspace()
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
      // Rollback to original filesystem
      setFileSystem(originalFs)
      setTimeout(() => setError(null), 4000)
    } finally {
      setUploading(false)
    }
  }

  const handleCustomFileUpload = async (file, isDeliverable = false) => {
    if (!file) return

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = file.type.startsWith('image/') || /\.(webp|png|jpg|jpeg|gif|bmp|tiff|svg)$/i.test(file.name)

    if (!isPdf && !isImage) {
      setError("Only PDF and image files are allowed.")
      setTimeout(() => setError(null), 4000)
      return
    }

    const needsConversion = isImage && file.type !== 'image/webp' && !file.name.toLowerCase().endsWith('.webp')

    if (needsConversion) {
      setUploading(true)
      setError(null)
      try {
        const optimized = await convertToWebP(file)
        await proceedWithUpload(optimized, isDeliverable)
      } catch (err) {
        console.warn("Client WebP conversion failed, falling back to original image:", err)
        // Fall back to original file upload without optimizer modal
        await proceedWithUpload(file, isDeliverable)
      } finally {
        setUploading(false)
      }
    } else {
      // PDF or already WebP: upload directly immediately
      await proceedWithUpload(file, isDeliverable)
    }
  }

  const handleSaveFileContent = () => {
    if (!activeFileId) return
    const newFs = {
      ...fileSystem,
      [activeFileId]: {
        ...fileSystem[activeFileId],
        content: editorContent,
        size: new Blob([editorContent]).size
      }
    }
    updateFileSystem(newFs)
    setSystemMessage("Changes saved successfully!")
    setTimeout(() => setSystemMessage(null), 3000)
  }

  // Context Menu Actions & Helpers
  useEffect(() => {
    const handleGlobalInteraction = () => {
      if (contextMenu.visible) {
        if (Date.now() - contextMenuOpenedAtRef.current < 300) {
          return
        }
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
    }
    document.addEventListener('click', handleGlobalInteraction)
    document.addEventListener('touchstart', handleGlobalInteraction)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleGlobalInteraction)
      document.removeEventListener('touchstart', handleGlobalInteraction)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu.visible])

  const openContextMenu = (x, y, itemId) => {
    contextMenuOpenedAtRef.current = Date.now()
    setContextMenu({
      visible: true,
      x,
      y,
      itemId
    })
  }

  const handleContextMenu = (e, itemId) => {
    e.preventDefault()
    e.stopPropagation()
    openContextMenu(e.clientX, e.clientY, itemId)
  }

  // Touch Hold Events for Mobile
  const handleTouchStart = (e, itemId) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }

    if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current)

    touchTimeoutRef.current = setTimeout(() => {
      openContextMenu(touch.clientX, touch.clientY, itemId)
    }, 600)
  }

  const handleTouchMove = (e) => {
    if (!touchTimeoutRef.current) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartPosRef.current.x
    const dy = touch.clientY - touchStartPosRef.current.y
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearTimeout(touchTimeoutRef.current)
      touchTimeoutRef.current = null
    }
  }

  const handleTouchEnd = () => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current)
      touchTimeoutRef.current = null
    }
  }

  const isDescendant = (parentId, childId) => {
    let currId = parentId
    while (currId) {
      if (currId === childId) return true
      const node = fileSystem[currId]
      currId = node?.parentId
    }
    return false
  }

  const getFoldersList = () => {
    const folders = []
    const traverse = (nodeId, depth = 0) => {
      const node = fileSystem[nodeId]
      if (!node || node.type !== 'folder') return
      folders.push({ id: node.id, name: node.name, depth })
      if (node.children) {
        node.children.forEach(childId => traverse(childId, depth + 1))
      }
    }
    traverse('root')
    return folders
  }

  const handleCloneNode = (itemId) => {
    const item = fileSystem[itemId]
    if (!item) return

    const newFs = { ...fileSystem }

    const cloneNodeAndChildren = (originalId, parentFolderId, isRootClone = false) => {
      const orig = fileSystem[originalId]
      if (!orig) return null

      const cloneId = `${orig.type}_${Math.random().toString(36).substring(2, 9)}`

      let newName = orig.name
      if (isRootClone) {
        if (orig.type === 'folder') {
          newName = `${orig.name}_copy`
        } else {
          const fileExt = orig.fileType ? `.${orig.fileType}` : ''
          const baseName = orig.name.replace(/\.[^/.]+$/, "")
          newName = `${baseName}_copy${fileExt}`
        }
      }

      const clonedNode = {
        ...orig,
        id: cloneId,
        parentId: parentFolderId,
        name: newName,
        children: []
      }

      newFs[cloneId] = clonedNode

      if (orig.type === 'folder' && orig.children) {
        orig.children.forEach(childId => {
          const childCloneId = cloneNodeAndChildren(childId, cloneId, false)
          if (childCloneId) {
            clonedNode.children.push(childCloneId)
          }
        })
      }

      return cloneId
    }

    const rootCloneId = cloneNodeAndChildren(itemId, item.parentId, true)
    if (rootCloneId) {
      const parent = newFs[item.parentId]
      if (parent) {
        newFs[item.parentId] = {
          ...parent,
          children: [...(parent.children || []), rootCloneId]
        }
      }
      updateFileSystem(newFs)
      setSystemMessage(`${item.type === 'folder' ? 'Folder' : 'File'} cloned successfully!`)
      setTimeout(() => setSystemMessage(null), 3000)
    }
  }

  const handleMoveNode = (itemId, targetFolderId) => {
    if (itemId === targetFolderId) return
    if (isDescendant(targetFolderId, itemId)) {
      setError("Cannot move a folder into itself or its subfolders.")
      setTimeout(() => setError(null), 4000)
      return
    }

    const item = fileSystem[itemId]
    if (!item) return

    const oldParentId = item.parentId
    if (oldParentId === targetFolderId) return

    const newFs = { ...fileSystem }

    if (oldParentId && newFs[oldParentId]) {
      newFs[oldParentId] = {
        ...newFs[oldParentId],
        children: (newFs[oldParentId].children || []).filter(id => id !== itemId)
      }
    }

    if (newFs[targetFolderId]) {
      newFs[targetFolderId] = {
        ...newFs[targetFolderId],
        children: [...(newFs[targetFolderId].children || []), itemId]
      }
    }

    newFs[itemId] = {
      ...newFs[itemId],
      parentId: targetFolderId
    }

    updateFileSystem(newFs)
    setSystemMessage(`Moved to folder successfully!`)
    setTimeout(() => setSystemMessage(null), 3000)
  }

  const handleCopyNode = (itemId) => {
    setClipboard({ action: 'copy', itemId })
    setSystemMessage("Copied to clipboard. Paste in context menu.")
    setTimeout(() => setSystemMessage(null), 3000)
  }

  const handlePasteNode = (targetFolderId) => {
    if (!clipboard || !clipboard.itemId) return
    const sourceItem = fileSystem[clipboard.itemId]
    if (!sourceItem) return

    const newFs = { ...fileSystem }

    const cloneNodeAndChildren = (originalId, parentFolderId, isRootClone = false) => {
      const orig = fileSystem[originalId]
      if (!orig) return null

      const cloneId = `${orig.type}_${Math.random().toString(36).substring(2, 9)}`

      let newName = orig.name
      if (isRootClone) {
        if (orig.parentId === parentFolderId) {
          if (orig.type === 'folder') {
            newName = `${orig.name}_copy`
          } else {
            const fileExt = orig.fileType ? `.${orig.fileType}` : ''
            const baseName = orig.name.replace(/\.[^/.]+$/, "")
            newName = `${baseName}_copy${fileExt}`
          }
        }
      }

      const clonedNode = {
        ...orig,
        id: cloneId,
        parentId: parentFolderId,
        name: newName,
        children: []
      }

      newFs[cloneId] = clonedNode

      if (orig.type === 'folder' && orig.children) {
        orig.children.forEach(childId => {
          const childCloneId = cloneNodeAndChildren(childId, cloneId, false)
          if (childCloneId) {
            clonedNode.children.push(childCloneId)
          }
        })
      }

      return cloneId
    }

    const rootCloneId = cloneNodeAndChildren(clipboard.itemId, targetFolderId, true)
    if (rootCloneId) {
      const parent = newFs[targetFolderId]
      if (parent) {
        newFs[targetFolderId] = {
          ...parent,
          children: [...(parent.children || []), rootCloneId]
        }
      }
      updateFileSystem(newFs)
      setSystemMessage(`Pasted successfully!`)
      setTimeout(() => setSystemMessage(null), 3000)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputVal.trim()) return

    const messageText = inputVal.trim()
    setInputVal('')

    if (groupKey.startsWith('mock-')) {
      const newMsg = {
        id: messages.length + 1,
        sender: 'me',
        senderId: currentUser?.id,
        senderName: currentUser?.full_name || 'Me',
        text: messageText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent'
      }

      const updatedMsgs = [...messages, newMsg]
      setMessages(updatedMsgs)

      const chatKey = activeChannel.type === 'general'
        ? `sarena_workspace_chat_${groupKey}_general`
        : `sarena_workspace_chat_${groupKey}_dm_${activeChannel.userId}`

      localStorage.setItem(chatKey, JSON.stringify(updatedMsgs))

      setTimeout(() => {
        const partnerName = activeChannel.type === 'general'
          ? 'Team Bot'
          : (uniqueParticipants.find(p => p.id === activeChannel.userId)?.full_name || initiator?.full_name || 'Partner')

        const replyMsg = {
          id: updatedMsgs.length + 1,
          sender: 'partner',
          senderName: partnerName,
          text: `Received! I am checking the files in the workspace now. Let's sync soon.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        }
        const finalMsgs = [...updatedMsgs, replyMsg]
        setMessages(finalMsgs)
        localStorage.setItem(chatKey, JSON.stringify(finalMsgs))
      }, 1500)
    } else {
      try {
        const { error } = await supabase
          .from('workspace_chats')
          .insert({
            workspace_id: activeWorkspaceId,
            sender_id: currentUser.id,
            channel_type: activeChannel.type,
            recipient_id: activeChannel.type === 'dm' ? activeChannel.userId : null,
            message: messageText
          })
        if (error) {
          console.error("Error saving message:", error.message)
        }
        await loadChatFromDb()
      } catch (e) {
        console.error("Error saving message:", e)
      }
    }
  }

  const renderMarkdown = (md) => {
    if (!md) return ''
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    html = html.replace(/^### (.*$)/gim, '<h4 class="text-xs font-bold text-black mt-3 mb-1 font-sans">$1</h4>')
    html = html.replace(/^## (.*$)/gim, '<h3 class="text-sm font-bold text-black mt-4 mb-2 border-b-2 border-black pb-1 font-sans">$1</h3>')
    html = html.replace(/^# (.*$)/gim, '<h2 class="text-base font-black text-black mt-5 mb-3 font-sans">$1</h2>')
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    html = html.replace(/^\* (.*$)/gim, '<li class="list-disc ml-4 text-[11px] text-slate-800 my-1 font-sans">$1</li>')
    html = html.replace(/`(.*?)`/gim, '<code class="bg-slate-100 border border-black px-1.5 py-0.5 rounded-none text-[10px] font-mono">$1</code>')

    html = html.split('\n').map(line => {
      if (line.trim().startsWith('<h') || line.trim().startsWith('<li') || line.trim() === '') {
        return line
      }
      return `<p class="text-[11px] text-slate-700 leading-relaxed my-2 font-sans">${line}</p>`
    }).join('\n')

    return html
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  if (loading) return <div className="text-center py-24 text-black font-mono font-bold text-xs uppercase tracking-wider">Loading workspace...</div>
  if (error && !workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center select-none bg-slate-50">
        <div className="max-w-md w-full border-4 border-black bg-white p-8 shadow-brutalist relative">
          <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-accent-orange border-2 border-black px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
            Error
          </div>
          <div className="w-12 h-12 border-2 border-black bg-accent-orange/15 mx-auto flex items-center justify-center shadow-brutalist-xs mb-6">
            <AlertTriangle className="w-6 h-6 text-accent-orange" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-tight text-black mb-2">
            Failed to Fetch Workspace
          </h2>
          <p className="text-xs font-mono text-slate-700 leading-relaxed mb-6">
            {error || "We couldn't retrieve the workspace details. Please check your network connection and try again."}
          </p>
          <Button
            onClick={() => {
              setError(null)
              setLoading(true)
              loadWorkspace()
            }}
            variant="default"
            className="w-full flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </Button>
        </div>
      </div>
    )
  }

  const isClient = currentUser?.id === workspace.client_id
  const isCreator = currentUser?.id === workspace.creator_id

  // Status mapping colors & labels
  let statusBadge = null
  let statusText = ""
  let statusColor = "text-slate-500"

  if (activeWS.status === 'pending' && (!activeWS.client_id || !activeWS.creator_id)) {
    statusBadge = <Badge variant="destructive">Public Opening</Badge>
    statusText = `Seeking a ${!activeWS.client_id ? 'Client' : 'Designer'} to start project`
    statusColor = "text-accent-orange font-black"
  } else if (activeWS.status === 'pending') {
    if (!activeWS.handshake) {
      statusBadge = <Badge variant="warning" className="bg-accent-yellow text-black border-black">Menunggu Persetujuan Desainer</Badge>
      statusText = "Waiting for designer to accept project proposal"
      statusColor = "text-accent-yellow font-black"
    } else {
      statusBadge = <Badge variant="info" className="bg-accent-blue text-black border-black">Menunggu Pembayaran Escrow</Badge>
      statusText = "Designer accepted! Waiting for client escrow payment"
      statusColor = "text-accent-blue font-black"
    }
  } else if (activeWS.status === 'escrow') {
    if (!activeWS.handshake) {
      statusBadge = <Badge variant="destructive">Pending Handshake</Badge>
      statusText = "Funds secured. Awaiting designer agreement"
      statusColor = "text-accent-orange font-black"
    } else {
      statusBadge = <Badge variant="default">Active Workload</Badge>
      statusText = "Collaboration in progress"
      statusColor = "text-accent-lime font-black"
    }
  } else if (activeWS.status === 'released') {
    statusBadge = <Badge variant="info">Completed &amp; Released</Badge>
    statusText = "Project completed. Funds released to creator."
    statusColor = "text-accent-blue font-black"
  } else if (activeWS.status === 'refunded') {
    statusBadge = <Badge variant="destructive">Refunded</Badge>
    statusText = "Workspace refunded. Escrow returned to client."
    statusColor = "text-accent-orange font-black"
  }

  const renderEscrowActions = () => {
    if (mockActiveWorkspace) {
      if (activeWS.status === 'pending') {
        return (
          <Button
            onClick={() => {
              const updated = { ...mockActiveWorkspace, status: 'escrow', handshake: false }
              setMockActiveWorkspace(updated)
              setSystemMessage("Payment completed successfully! (Mock)")
              setTimeout(() => setSystemMessage(null), 3000)
            }}
            size="sm"
            variant="default"
          >
            Pay Escrow (Simulated)
          </Button>
        )
      }
      if (activeWS.status === 'escrow' && !activeWS.handshake) {
        return (
          <Button
            onClick={() => {
              const updated = { ...mockActiveWorkspace, handshake: true }
              setMockActiveWorkspace(updated)
              setSystemMessage("Handshake accepted! (Mock)")
              setTimeout(() => setSystemMessage(null), 3000)
            }}
            size="sm"
            variant="default"
            className="bg-accent-yellow text-black"
          >
            Accept Handshake (Simulated)
          </Button>
        )
      }
      if (activeWS.status === 'escrow' && activeWS.handshake) {
        return (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const updated = { ...mockActiveWorkspace, status: 'released' }
                setMockActiveWorkspace(updated)
                setSystemMessage("Funds released to designer! (Mock)")
                setTimeout(() => setSystemMessage(null), 3000)
              }}
              size="sm"
              variant="default"
            >
              Approve &amp; Release
            </Button>
            {activeWS.revisions - (activeWS.revisions_used || 0) > 0 && (
              <Button
                onClick={() => {
                  const updated = { ...mockActiveWorkspace, revisions_used: (activeWS.revisions_used || 0) + 1 }
                  setMockActiveWorkspace(updated)
                  setSystemMessage("Revision requested! (Mock)")
                  setTimeout(() => setSystemMessage(null), 3000)
                }}
                variant="outline"
                size="sm"
              >
                Request Revision
              </Button>
            )}
          </div>
        )
      }
      return <Badge variant="outline">Completed</Badge>
    }

    // Real DB workspaces
    if (workspace.status === 'pending') {
      const isPublic = !workspace.client_id || !workspace.creator_id

      if (isPublic) {
        const isCreatorMissing = !workspace.creator_id

        if (workspace.created_by === currentUser?.id) {
          return <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">Awaiting collaborator to join...</span>
        }

        return (
          <Button
            onClick={handleJoinProject}
            disabled={actionLoading}
            variant="default"
            size="sm"
          >
            {actionLoading ? 'Joining...' : `Join Project as ${isCreatorMissing ? 'Designer' : 'Client'}`}
          </Button>
        )
      }

      if (!workspace.handshake) {
        if (isCreator) {
          return (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleHandshake}
                disabled={actionLoading}
                variant="default"
                size="sm"
                className="bg-accent-lime text-black font-black uppercase shadow-brutalist-xs"
              >
                {actionLoading ? 'Memproses...' : '✅ Terima Proyek'}
              </Button>
              <Button
                onClick={handleRejectProject}
                disabled={actionLoading}
                variant="outline"
                size="sm"
                className="border-2 border-black bg-white text-rose-600 font-bold uppercase shadow-brutalist-xs"
              >
                ❌ Tolak
              </Button>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-300 px-2 py-1 font-mono font-bold uppercase">⏳ Menunggu Persetujuan Desainer</span>
            <Button
              onClick={handleRejectProject}
              disabled={actionLoading}
              variant="outline"
              size="sm"
              className="border-2 border-black bg-white text-rose-600 font-bold uppercase shadow-brutalist-xs text-xs"
            >
              ❌ Batalkan
            </Button>
          </div>
        )
      }

      if (isClient) {
        return (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleFundProject}
              disabled={actionLoading}
              variant="default"
              size="sm"
              className="bg-accent-lime text-black font-black uppercase shadow-brutalist-xs"
              noBounce
            >
              {actionLoading ? 'Menyiapkan Invoice...' : '💳 Bayar Sekarang (Escrow)'}
            </Button>
            <Button
              onClick={handleRejectProject}
              disabled={actionLoading}
              variant="outline"
              size="sm"
              className="border-2 border-black bg-white text-rose-600 font-bold uppercase shadow-brutalist-xs text-xs"
            >
              ❌ Batalkan
            </Button>
          </div>
        )
      }

      return (
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-blue-700 bg-blue-50 border border-blue-300 px-2 py-1 font-mono font-bold uppercase">⏳ Menunggu Pembayaran Klien</span>
          <Button
            onClick={handleRejectProject}
            disabled={actionLoading}
            variant="outline"
            size="sm"
            className="border-2 border-black bg-white text-rose-600 font-bold uppercase shadow-brutalist-xs text-xs"
          >
            ❌ Tolak
          </Button>
        </div>
      )
    }

    if (workspace.status === 'escrow' && !workspace.handshake) {
      if (isCreator) {
        return (
          <Button
            onClick={handleHandshake}
            disabled={actionLoading}
            variant="default"
            size="sm"
            className="bg-accent-yellow text-black"
          >
            {actionLoading ? 'Accepting...' : 'Accept Work & Handshake'}
          </Button>
        )
      }
      return <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">Awaiting Designer Agreement...</span>
    }

    if (workspace.status === 'escrow' && workspace.handshake) {
      return (
        <div className="flex gap-2">
          {isClient && (
            <>
              <Button
                onClick={() => setShowReleaseModal(true)}
                disabled={actionLoading}
                variant="default"
                size="sm"
              >
                Approve &amp; Release
              </Button>
              {workspace.revisions - workspace.revisions_used > 0 ? (
                <Button
                  onClick={handleRequestRevision}
                  disabled={actionLoading}
                  variant="outline"
                  size="sm"
                  className="hover:bg-accent-orange"
                >
                  Request Revision
                </Button>
              ) : (
                <Button disabled variant="outline" size="sm" className="opacity-50 cursor-not-allowed">
                  No Revisions Left
                </Button>
              )}
            </>
          )}
          {isCreator && (
            <span className="text-[10px] text-emerald-600 font-mono font-bold uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 border border-black shadow-brutalist-sm animate-pulse shrink-0" />
              Project active. Upload deliverables.
            </span>
          )}
        </div>
      )
    }

    if (workspace.status === 'released') {
      return <Badge variant="outline" className="bg-accent-lime">Completed</Badge>
    }

    if (workspace.status === 'refunded') {
      return <Badge variant="outline" className="bg-accent-orange">Refunded</Badge>
    }

    return null
  }

  // Storage info calculations
  const usedStorage = calculateStorageUsed(fileSystem)
  const maxStorage = 10 * 1024 * 1024 // 10MB
  const storagePercent = Math.min((usedStorage / maxStorage) * 100, 100)

  const editClientSuggestions = editClientInput.trim()
    ? userList.filter(u => {
      const search = editClientInput.trim().replace(/^@/, '').toLowerCase()
      return (
        (u.username && u.username.toLowerCase().includes(search)) ||
        (u.full_name && u.full_name.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search))
      ) && !editClients.some(invited => invited.id === u.id)
    }).slice(0, 5)
    : []

  const editDesignerSuggestions = editDesignerInput.trim()
    ? userList.filter(u => {
      const search = editDesignerInput.trim().replace(/^@/, '').toLowerCase()
      return (
        (u.username && u.username.toLowerCase().includes(search)) ||
        (u.full_name && u.full_name.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search))
      ) && !editDesigners.some(invited => invited.id === u.id)
    }).slice(0, 5)
    : []

  const breadcrumbs = getBreadcrumbs()
  const currentFolder = fileSystem[currentFolderId]
  const childrenIds = currentFolder?.children || []
  const currentItems = fileSearchQuery.trim()
    ? Object.values(fileSystem)
      .filter(item => item && item.id !== 'root' && item.name.toLowerCase().includes(fileSearchQuery.toLowerCase()))
    : childrenIds.map(id => fileSystem[id]).filter(Boolean)

  const activeFile = fileSystem[activeFileId]
  const chatPartnerName = activeWS.partnerName || (isClient ? activeWS.creator?.full_name : activeWS.client?.full_name) || 'Partner'
  const chatPartnerRole = activeWS.role || (isClient ? 'Designer (Contractor)' : 'Client (Owner)')
  const chatPartnerAvatar = activeWS.avatarSeed
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${activeWS.avatarSeed}`
    : (isClient ? activeWS.creator?.avatar_url : activeWS.client?.avatar_url) || `https://api.dicebear.com/7.x/identicon/svg?seed=${chatPartnerName}`

  const startResizeSidebar = (e) => {
    e.preventDefault()
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = sidebarWidth

    const doDrag = (moveEvent) => {
      const newWidth = Math.max(180, Math.min(380, startWidth + (moveEvent.clientX - startX)))
      setSidebarWidth(newWidth)
    }

    const stopDrag = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', doDrag)
      document.removeEventListener('mouseup', stopDrag)
    }

    document.addEventListener('mousemove', doDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  const startResizeExplorer = (e) => {
    e.preventDefault()
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = explorerWidth

    const doDrag = (moveEvent) => {
      const newWidth = Math.max(250, Math.min(750, startWidth - (moveEvent.clientX - startX)))
      setExplorerWidth(newWidth)
    }

    const stopDrag = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', doDrag)
      document.removeEventListener('mouseup', stopDrag)
    }

    document.addEventListener('mousemove', doDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }))
  }

  const togglePin = async (itemId) => {
    let newPinned
    if (pinnedIds.includes(itemId)) {
      newPinned = pinnedIds.filter(id => id !== itemId)
    } else {
      if (pinnedIds.length >= 3) {
        setSystemMessage("Maximum of 3 pinned items allowed.")
        setTimeout(() => setSystemMessage(null), 3000)
        return
      }
      newPinned = [...pinnedIds, itemId]
    }
    setPinnedIds(newPinned)

    // Persist pinned state inside file_system._pinnedIds
    const newFs = { ...fileSystem, _pinnedIds: newPinned }
    setFileSystem(newFs)
    if (activeWorkspaceId) {
      localStorage.setItem(`sarena_workspace_files_${activeWorkspaceId}`, JSON.stringify(newFs))
      if (!activeWorkspaceId.startsWith('mock-')) {
        await saveFileSystemToDb(newFs)
      }
    }
  }

  const renderTree = (nodeId, depth = 0) => {
    const item = fileSystem[nodeId]
    if (!item) return null

    const isFolder = item.type === 'folder'
    const isExpanded = expandedFolders[nodeId]
    const isActive = activeFileId === item.id

    if (nodeId === 'root') {
      return (item.children || []).map(childId => renderTree(childId, depth))
    }

    const isPinned = pinnedIds.includes(item.id)
    const isUploading = item.isUploading

    return (
      <div key={item.id} className="w-full select-none">
        <div
          onClick={() => {
            if (isUploading) return
            if (isFolder) {
              toggleFolder(item.id)
              setCurrentFolderId(item.id)
            } else {
              handleItemClick(item)
            }
          }}
          onContextMenu={(e) => {
            if (isUploading) {
              e.preventDefault()
              return
            }
            handleContextMenu(e, item.id)
          }}
          onTouchStart={(e) => {
            if (isUploading) {
              e.preventDefault()
              return
            }
            handleTouchStart(e, item.id)
          }}
          onTouchMove={isUploading ? undefined : handleTouchMove}
          onTouchEnd={isUploading ? undefined : handleTouchEnd}
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
          className={`group flex items-center justify-between py-1 px-1.5 border border-transparent transition-all ${
            isUploading
              ? 'opacity-70 cursor-not-allowed bg-slate-50'
              : 'cursor-pointer hover:bg-slate-100'
          } ${isFolder
            ? currentFolderId === item.id
              ? 'bg-accent-lime/10 border-accent-lime text-black font-bold'
              : 'text-slate-950 font-semibold'
            : isActive
              ? 'bg-accent-lime/15 border-accent-lime text-black font-bold'
              : 'text-slate-950 font-semibold'
            }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {isFolder ? (
              <ChevronRight className={`w-3.5 h-3.5 text-black shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            ) : (
              <span className="w-3.5 h-3.5 shrink-0" />
            )}

            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin shrink-0" />
            ) : isFolder ? (
              <div className="relative shrink-0 flex items-center">
                <Folder className="w-3.5 h-3.5 text-accent-yellow fill-accent-yellow/10 shrink-0" />
                {(item.id === 'deliverables_folder' || item.name?.toLowerCase() === 'deliverables') && (
                  <Lock className="w-2 h-2 text-amber-900 absolute -top-0.5 -right-0.5" />
                )}
              </div>
            ) : item.fileType === 'md' ? (
              <FileCode className="w-3.5 h-3.5 text-accent-blue shrink-0" />
            ) : item.fileType === 'pdf' ? (
              <FileText className="w-3.5 h-3.5 text-accent-orange shrink-0" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-accent-lime shrink-0" />
            )}

            <span className={`text-[10.5px] font-bold truncate tracking-tight flex items-center gap-1 ${isUploading ? 'text-slate-550 italic font-medium' : ''}`}>
              {item.name} {isUploading && '(Uploading...)'}
              {(item.id === 'deliverables_folder' || item.name?.toLowerCase() === 'deliverables') && (
                <span className="text-[8px] font-mono font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0.2">LOCKED</span>
              )}
            </span>
          </div>

          {/* Options are available only in context menu */}
        </div>

        {isFolder && isExpanded && item.children && item.children.length > 0 && (
          <div className="w-full">
            {item.children.map(childId => renderTree(childId, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderFileExplorer = () => {
    const isCurrentInDeliverables = 
      currentFolderId === 'deliverables_folder' ||
      fileSystem[currentFolderId]?.name?.toLowerCase() === 'deliverables' ||
      fileSystem[currentFolderId]?.parentId === 'deliverables_folder'

    return (
      <div className="flex-grow flex flex-col h-full min-h-0 overflow-hidden">
        {/* File Manager Header */}
        <div className="p-3 border-b-2 border-black bg-slate-50 flex-none space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-[10px] font-black font-mono text-slate-700 tracking-widest uppercase">File Explorer</h3>
              <div className="flex items-center border border-black bg-white shadow-brutalist-xs text-[8.5px] font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setExplorerViewMode('directory')}
                  className={`px-2 py-0.5 uppercase transition-colors ${explorerViewMode === 'directory' ? 'bg-black text-white' : 'text-black hover:bg-slate-100'}`}
                  title="Tampilan Direktori Folder"
                >
                  Direktori
                </button>
                <button
                  type="button"
                  onClick={() => setExplorerViewMode('tree')}
                  className={`px-2 py-0.5 uppercase transition-colors ${explorerViewMode === 'tree' ? 'bg-black text-white' : 'text-black hover:bg-slate-100'}`}
                  title="Tampilan Pohon Folder (Tree)"
                >
                  Tree
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isCurrentInDeliverables && !isCreator ? (
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-300 text-amber-900 text-[8.5px] font-mono font-bold select-none">
                  <Lock className="w-3 h-3 text-amber-700" />
                  <span>Folder Terkunci</span>
                </div>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      setIsCreatingFolder(true)
                      setIsCreatingFile(false)
                      setNewItemName('')
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 border border-black rounded-none hover:bg-slate-100 shadow-brutalist-sm bg-white text-black"
                    title="New Folder"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    onClick={() => {
                      setIsCreatingFile(true)
                      setIsCreatingFolder(false)
                      setNewItemName('')
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 border border-black rounded-none hover:bg-slate-100 shadow-brutalist-sm bg-white text-black"
                    title="New MD File"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    onClick={triggerFileUpload}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 border border-black rounded-none hover:bg-slate-100 shadow-brutalist-sm bg-white text-black btn-bounce"
                    title="Upload PDF or Images"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleCustomFileUpload(file)
                    }}
                    accept=".pdf,.webp,image/*"
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 text-[9px] font-bold font-mono text-slate-800 select-none py-1 border-t border-black/10">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1
                return (
                  <div key={crumb.id} className="flex items-center">
                    {idx > 0 && <ChevronRight className="w-2.5 h-2.5 mx-0.5 text-slate-800" />}
                    <span
                      onClick={() => !isLast && setCurrentFolderId(crumb.id)}
                      className={`cursor-pointer hover:text-black uppercase ${isLast ? 'text-black font-black bg-accent-lime px-1.5 py-0.2 border border-black' : 'hover:underline'}`}
                    >
                      {crumb.name === 'Root' ? 'Home' : crumb.name}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* File Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-3 h-3 text-slate-800" />
            <Input
              type="text"
              value={fileSearchQuery}
              onChange={(e) => setFileSearchQuery(e.target.value)}
              placeholder="Filter files..."
              className="pl-7 h-8 text-[9px] text-black placeholder-slate-800 font-semibold"
            />
          </div>
        </div>

        {/* Files List Container */}
        <div
          onContextMenu={(e) => {
            if (e.target === e.currentTarget) {
              handleContextMenu(e, currentFolderId || 'root')
            }
          }}
          className="flex-1 overflow-y-auto p-2.5 space-y-1 bg-slate-50/20 min-h-0"
        >
          {isCreatingFolder && (
            <div className="flex items-center gap-2.5 p-2 rounded-none bg-white border-2 border-black shadow-brutalist-sm mb-1">
              <Folder className="w-4 h-4 text-accent-yellow fill-accent-yellow/10 shrink-0" />
              <form onSubmit={handleCreateFolder} className="flex-1 flex items-center gap-1">
                <Input
                  autoFocus
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Folder name..."
                  className="h-7 text-[9px] px-2"
                />
                <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0 border border-black rounded-none bg-accent-lime text-black">
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" onClick={() => setIsCreatingFolder(false)} size="sm" variant="ghost" className="h-7 w-7 p-0 border border-black rounded-none bg-white text-black">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          )}

          {isCreatingFile && (
            <div className="flex items-center gap-2.5 p-2 rounded-none bg-white border-2 border-black shadow-brutalist-sm mb-1">
              <FileCode className="w-4 h-4 text-accent-blue shrink-0" />
              <form onSubmit={handleCreateFile} className="flex-1 flex items-center gap-1">
                <Input
                  autoFocus
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="filename.md..."
                  className="h-7 text-[9px] px-2"
                />
                <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0 border border-black rounded-none bg-accent-lime text-black">
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" onClick={() => setIsCreatingFile(false)} size="sm" variant="ghost" className="h-7 w-7 p-0 border border-black rounded-none bg-white text-black">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          )}

          {currentFolderId !== 'root' && explorerViewMode === 'directory' && !fileSearchQuery && (
            <div
              onClick={() => {
                const parentId = fileSystem[currentFolderId]?.parentId || 'root'
                setCurrentFolderId(parentId)
              }}
              className="flex items-center gap-2 p-2 bg-white border-2 border-black hover:bg-slate-100 transition-colors cursor-pointer text-[10px] font-black font-mono text-black shadow-brutalist-xs select-none mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-black" />
              <span>.. (Ke Direktori Induk / Up)</span>
            </div>
          )}

          {isCurrentInDeliverables && explorerViewMode === 'directory' && !fileSearchQuery && (
            <div className="p-2 mb-2 bg-amber-50 border-2 border-amber-400 text-amber-950 flex items-center justify-between text-[9px] font-mono font-bold select-none shadow-brutalist-xs">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <div>
                  <p className="uppercase text-amber-950 font-black">Folder Deliverables Terproteksi</p>
                  <p className="text-[8px] text-amber-900 font-normal">
                    {!isCreator 
                      ? (activeWS.status === 'released' 
                          ? 'Proyek telah disetujui. File dapat diunduh.' 
                          : 'Hanya dapat melihat file. Pengunduhan terkunci sampai proyek disetujui.') 
                      : 'Folder khusus deliverables proyek.'}
                  </p>
                </div>
              </div>
              {!isCreator && activeWS.status !== 'released' && (
                <span className="bg-amber-200 text-amber-950 border border-amber-400 px-1.5 py-0.5 text-[8px] uppercase">
                  LOCKED
                </span>
              )}
            </div>
          )}

          {explorerViewMode === 'tree' && !fileSearchQuery ? (
            /* Recursive Tree View */
            <div className="space-y-0.5">
              {renderTree('root')}
            </div>
          ) : (
            /* Directory View (current folder contents) or Search results */
            <div className="space-y-1.5">
              {currentItems.length === 0 ? (
                <div className="text-center py-10 px-4 border-2 border-dashed border-black/30 bg-white/60 space-y-2 select-none">
                  <Folder className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-[11px] font-mono font-bold text-slate-700 uppercase">
                    {fileSearchQuery ? "Tidak ada file yang cocok" : "Folder ini masih kosong"}
                  </p>
                  <p className="text-[9.5px] font-sans text-slate-500 max-w-xs mx-auto">
                    {fileSearchQuery ? "Coba gunakan kata kunci pencarian lain." : "Gunakan tombol New Folder, New File, atau Upload di atas untuk mengisi direktori ini."}
                  </p>
                </div>
              ) : (
                currentItems.map(item => {
                  const isFolder = item.type === 'folder'
                  const isActive = activeFileId === item.id
                  const isPinned = pinnedIds.includes(item.id)
                  const isUploading = item.isUploading
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isUploading) return
                        if (isFolder) {
                          setCurrentFolderId(item.id)
                        } else {
                          handleItemClick(item)
                        }
                      }}
                      onContextMenu={(e) => {
                        if (isUploading) {
                          e.preventDefault()
                          return
                        }
                        handleContextMenu(e, item.id)
                      }}
                      onTouchStart={(e) => {
                        if (isUploading) {
                          e.preventDefault()
                          return
                        }
                        handleTouchStart(e, item.id)
                      }}
                      onTouchMove={isUploading ? undefined : handleTouchMove}
                      onTouchEnd={isUploading ? undefined : handleTouchEnd}
                      className={`group flex items-center justify-between p-2 rounded-none border-2 border-black transition-all shadow-brutalist-xs ${
                        isUploading
                          ? 'opacity-70 cursor-not-allowed bg-slate-50'
                          : 'cursor-pointer bg-white hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0'
                      } ${isActive ? 'bg-accent-lime/20 border-accent-lime font-bold' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 text-slate-500 animate-spin shrink-0" />
                        ) : isFolder ? (
                          <div className="relative shrink-0 flex items-center">
                            <Folder className="w-4 h-4 text-accent-yellow fill-accent-yellow/10 shrink-0" />
                            {(item.id === 'deliverables_folder' || item.name?.toLowerCase() === 'deliverables') && (
                              <Lock className="w-2.5 h-2.5 text-amber-900 absolute -top-1 -right-1" />
                            )}
                          </div>
                        ) : item.fileType === 'md' ? (
                          <FileCode className="w-4 h-4 text-accent-blue shrink-0" />
                        ) : item.fileType === 'pdf' ? (
                          <FileText className="w-4 h-4 text-accent-orange shrink-0" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-accent-lime shrink-0" />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className={`text-[10.5px] font-bold text-slate-900 truncate ${isUploading ? 'text-slate-550 italic font-medium' : ''}`}>
                            {item.name} {isUploading && '(Uploading...)'}
                          </span>
                          <span className="text-[8.5px] font-mono text-slate-500 uppercase">
                            {isFolder ? (
                              (item.id === 'deliverables_folder' || item.name?.toLowerCase() === 'deliverables')
                                ? `${item.children?.length || 0} item · 🔒 Deliverables (Locked)`
                                : `${item.children?.length || 0} item`
                            ) : item.fileType ? `${item.fileType.toUpperCase()} File` : 'File'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isFolder ? (
                          <span className="text-[8.5px] font-mono font-bold bg-slate-100 border border-black px-1.5 py-0.5 uppercase">Buka Folder ➔</span>
                        ) : (
                          <span className="text-[8.5px] font-mono font-bold bg-accent-lime border border-black px-1.5 py-0.5 text-black uppercase">Tinjau ➔</span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderFileViewer = () => {
    if (!activeFileId || !activeFile) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-slate-50 text-center select-none h-full">
          <div className="w-14 h-14 border-2 border-black bg-white flex items-center justify-center shadow-brutalist mb-3">
            <FileCode className="w-7 h-7 text-black" />
          </div>
          <h3 className="text-xs font-black uppercase text-black mb-1 tracking-tight">No File Selected</h3>
          <p className="text-[10px] text-slate-800 font-semibold leading-relaxed max-w-[200px] text-center">
            Click any document, PDF, or WebP mockup in the File Explorer to open the editor and review panel.
          </p>
        </div>
      )
    }

    return (
      <div className="flex-grow flex flex-col h-full bg-white text-black min-h-0 overflow-hidden">
        {/* File Preview Header */}
        <div className="p-3 border-b-2 border-black flex justify-between items-center bg-slate-50 flex-none">
          <div className="flex items-center gap-2 min-w-0">
            {activeFile.fileType === 'md' ? (
              <FileCode className="w-4 h-4 text-accent-blue shrink-0" />
            ) : activeFile.fileType === 'pdf' ? (
              <FileText className="w-4 h-4 text-accent-orange shrink-0" />
            ) : (
              <ImageIcon className="w-4 h-4 text-accent-lime shrink-0" />
            )}
            <div className="min-w-0 font-mono">
              <h3 className="text-[11px] font-bold text-black truncate leading-tight">{activeFile.name}</h3>
              <p className="text-[8.5px] font-semibold text-slate-800">{formatSize(activeFile.size)}</p>
            </div>
          </div>

          <Button
            onClick={() => setActiveFileId(null)}
            variant="ghost"
            size="sm"
            className="h-6.5 text-[9.5px] border border-black bg-white hover:bg-slate-100 shadow-brutalist-xs rounded-none text-black px-2 flex items-center gap-1 shrink-0 font-mono uppercase"
          >
            <X className="w-3 h-3" />
            Close
          </Button>
        </div>

        {/* File Render Workspace */}
        <div className="flex-grow overflow-y-auto p-3 flex flex-col bg-slate-50/10 min-h-0">
          {activeFile.fileType === 'md' ? (
            <div className="flex-grow flex flex-col h-full min-h-0">
              <div className="flex justify-between items-center pb-2 border-b-2 border-black/10 flex-none mb-2.5">
                <span className="text-[9px] font-bold font-mono bg-accent-lime text-black border border-black px-2 py-0.5 shadow-brutalist-xs uppercase">Markdown</span>
                <Button
                  onClick={handleSaveFileContent}
                  variant="default"
                  size="sm"
                  className="h-6.5 text-[9.5px] font-mono font-black"
                >
                  Save Changes
                </Button>
              </div>

              {/* Tab Selector */}
              <div className="flex-none flex border-b-2 border-black bg-slate-50/50 mb-2.5">
                <button
                  onClick={() => setEditorTab('edit')}
                  className={`flex-1 py-1 text-[9px] font-mono font-black uppercase border-r-2 border-black transition-all ${editorTab === 'edit'
                    ? 'bg-accent-lime text-black border-b-2 border-b-black'
                    : 'bg-white text-slate-800 hover:text-black border-b border-b-transparent'
                    }`}
                >
                  Edit File
                </button>
                <button
                  onClick={() => setEditorTab('preview')}
                  className={`flex-1 py-1 text-[9px] font-mono font-black uppercase transition-all ${editorTab === 'preview'
                    ? 'bg-accent-lime text-black border-b-2 border-b-black'
                    : 'bg-white text-slate-800 hover:text-black border-b border-b-transparent'
                    }`}
                >
                  Preview Output
                </button>
              </div>

              <div className="flex-grow overflow-hidden min-h-0 h-full">
                {editorTab === 'edit' ? (
                  <div className="flex flex-col h-full min-h-0">
                    <Textarea
                      value={editorContent}
                      onChange={(e) => setEditorContent(e.target.value)}
                      className="w-full text-[11px] font-mono border-2 border-black bg-white leading-relaxed p-2.5 rounded-none shadow-inner resize-none flex-grow h-full min-h-[200px]"
                      placeholder="# Write markdown here..."
                    />
                  </div>
                ) : (
                  <div className="flex flex-col h-full min-h-0">
                    <div
                      className="flex-grow p-3 bg-white border-2 border-black rounded-none prose prose-sm max-w-none shadow-brutalist-sm overflow-y-auto min-h-[200px] h-full"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(editorContent) }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (() => {
            const isDeliverablesFile = 
              activeFile.parentId === 'deliverables_folder' ||
              fileSystem[activeFile.parentId]?.name?.toLowerCase() === 'deliverables' ||
              activeFile.isDeliverable

            const isDownloadLocked = isDeliverablesFile && activeWS.status !== 'released' && !isCreator

            if (activeFile.fileType === 'pdf') {
              return (
                <div className="flex-grow flex flex-col p-2 bg-slate-50 border-2 border-black rounded-none shadow-inner h-full min-h-0 overflow-hidden">
                  <div className="flex justify-between items-center bg-white border border-black p-2 mb-2 flex-none shadow-brutalist-xs">
                    <div className="min-w-0">
                      <h4 className="text-[10px] font-bold text-black truncate max-w-[150px]">{activeFile.name}</h4>
                      <p className="text-[8px] font-mono text-slate-600 uppercase font-bold">PDF ({formatSize(activeFile.size)})</p>
                    </div>
                    {isDownloadLocked ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-900 text-[9px] font-mono font-bold uppercase select-none">
                        <Lock className="w-3 h-3 text-amber-700" />
                        <span>Unduh Terkunci</span>
                      </div>
                    ) : (
                      <a href={activeFile.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="default" size="sm" className="h-6.5 text-[9px] px-2.5">
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </Button>
                      </a>
                    )}
                  </div>
                  <iframe
                    src={isDownloadLocked ? `${activeFile.url}#toolbar=0&navpanes=0` : activeFile.url}
                    className="w-full flex-grow border-2 border-black rounded-none shadow-brutalist bg-white"
                    title="PDF Preview"
                  />
                  {isDownloadLocked && (
                    <div className="mt-1 flex items-center gap-1 px-2 py-1 bg-amber-100 border border-amber-300 text-amber-950 text-[8.5px] font-mono font-bold uppercase">
                      <Lock className="w-3 h-3 text-amber-700" />
                      <span>Folder Deliverables Terproteksi · Hanya dapat dilihat, unduhan aktif setelah persetujuan proyek</span>
                    </div>
                  )}
                </div>
              )
            }

            return (
              /* WebP Image state */
              <div className="flex-grow flex flex-col p-2 bg-slate-50 border-2 border-black rounded-none shadow-inner h-full min-h-0 overflow-hidden">
                <div className="flex justify-between items-center bg-white border border-black p-2 mb-2 flex-none shadow-brutalist-xs">
                  <div className="min-w-0">
                    <h4 className="text-[10px] font-bold text-black truncate max-w-[150px]">{activeFile.name}</h4>
                    <p className="text-[8px] font-mono text-slate-650 uppercase font-bold">WebP ({formatSize(activeFile.size)})</p>
                  </div>
                  {isDownloadLocked ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-900 text-[9px] font-mono font-bold uppercase select-none">
                      <Lock className="w-3 h-3 text-amber-700" />
                      <span>Unduh Terkunci</span>
                    </div>
                  ) : (
                    <a href={activeFile.url} download={activeFile.name} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary" size="sm" className="h-6.5 text-[9px] px-2.5">
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </Button>
                    </a>
                  )}
                </div>
                <div 
                  className="flex-grow w-full rounded-none border-2 border-black shadow-brutalist-sm bg-white p-2 flex flex-col items-center justify-center overflow-auto min-h-0 select-none"
                  onContextMenu={isDownloadLocked ? (e) => e.preventDefault() : undefined}
                >
                  <img 
                    src={activeFile.url} 
                    alt={activeFile.name} 
                    onDragStart={isDownloadLocked ? (e) => e.preventDefault() : undefined}
                    className={`max-w-full max-h-full object-contain ${isDownloadLocked ? 'pointer-events-none select-none' : ''}`} 
                  />
                  {isDownloadLocked && (
                    <div className="mt-2 flex items-center gap-1 px-2.5 py-1 bg-amber-100 border-2 border-amber-400 text-amber-950 text-[9px] font-mono font-bold uppercase shadow-brutalist-xs">
                      <Lock className="w-3 h-3 text-amber-700" />
                      <span>Folder Deliverables Terproteksi · Hanya dapat dilihat, unduhan aktif setelah persetujuan proyek</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full px-3 md:px-6 py-3 md:py-4 text-black flex flex-col bg-slate-50 ${
      groupLocked ? 'h-auto min-h-full overflow-y-auto' : 'h-full overflow-hidden min-h-0'
    }`}>

      {/* Alert Messaging */}
      {error && (
        <div className="bg-accent-orange text-black border-2 border-black p-3 rounded-none text-xs font-mono font-bold shadow-brutalist-sm flex items-start gap-3 flex-none mb-3">
          <AlertTriangle className="w-4 h-4 text-black shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {systemMessage && (
        <div className="bg-accent-lime text-black border-2 border-black p-3 rounded-none text-xs font-mono font-bold shadow-brutalist-sm flex items-start gap-3 flex-none mb-3">
          <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5" />
          <span className="flex-1">{systemMessage}</span>
          <button
            onClick={() => setSystemMessage(null)}
            className="shrink-0 mt-0.5 text-black hover:text-black/60 transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Main Content Panels (Conditional Lock Screen or Workspace Tools) ─── */}
      {groupLocked ? (
          /* ─── LOCK SCREEN STATE: AWAITING INVITATION ACCEPTANCE ─── */
          <Card className="bg-white border-[3px] border-black rounded-none p-8 shadow-brutalist min-h-[500px] flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
                <div className="flex items-center gap-3">
                  <Link href="/dashboard">
                    <Button
                      variant="secondary"
                      className="w-7 h-7 p-0 flex items-center justify-center border-2 border-black rounded-none shadow-brutalist-xs hover:-translate-y-0.5 active:translate-y-0 active:shadow-none bg-white text-black shrink-0"
                      title="Kembali ke Dashboard"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-black" />
                    </Button>
                  </Link>
                  <div className="w-10 h-10 border-2 border-black bg-accent-orange flex items-center justify-center shadow-brutalist-sm shrink-0">
                    <ShieldAlert className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-black">Workspace Awaiting Acceptances</h2>
                    <p className="text-[9.5px] font-bold font-mono text-slate-800 uppercase tracking-widest mt-0.5">Secure Escrow Protection Protocol</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">Project Invitation Details</h3>
                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="flex justify-between items-center bg-slate-50 border border-black p-2 shadow-brutalist-xs">
                      <span className="font-bold text-slate-800 uppercase">Title:</span>
                      <span className="font-black text-black">{activeWS.title}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 border border-black p-2 shadow-brutalist-xs">
                      <span className="font-bold text-slate-800 uppercase">Budget:</span>
                      <span className="font-bold bg-white border border-black px-1.5 py-0.2">Rp {(activeWS.amount || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 border border-black p-2 shadow-brutalist-xs">
                      <span className="font-bold text-slate-800 uppercase">Revisions Allowed:</span>
                      <span className="font-bold bg-white border border-black px-1.5 py-0.2">{activeWS.revisions || 0} cycles</span>
                    </div>
                  </div>

                  <div className="bg-[#FAF9F6] border-2 border-black p-4 shadow-brutalist-sm">
                    <h4 className="text-[10px] font-black uppercase text-black mb-1.5">Creative Brief</h4>
                    <p className="text-[11px] text-slate-800 leading-relaxed font-sans font-semibold">
                      {activeWS.brief || "No brief specified."}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">Collaborator Statuses</h3>
                  <div className="space-y-2.5">
                    {/* Initiator */}
                    {(() => {
                      const initiatorRole = workspace && workspace.created_by === workspace.client_id ? 'Client' : 'Designer'
                      return (
                        <div className="flex items-center justify-between p-3 border-2 border-black bg-[#FAF9F6] shadow-brutalist-xs">
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              src={initiator?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${initiator?.username || 'host'}`}
                              name={initiator?.full_name || 'Host'}
                              className="w-6 h-6 rounded-none border border-black"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase text-black leading-none">{initiator?.full_name || 'Host'}</span>
                              <span className="text-[8px] font-bold font-mono uppercase text-slate-500 mt-0.5">{initiatorRole}</span>
                            </div>
                          </div>
                          <span className="text-[8.5px] font-bold font-mono bg-accent-lime text-black border border-black px-2 py-0.5 shadow-brutalist-xs uppercase">Initiated</span>
                        </div>
                      )
                    })()}

                    {/* Sibling rows (Invitees) */}
                    {siblings.map((sibling, idx) => {
                      const invitee = sibling.created_by === sibling.client_id ? sibling.creator : sibling.client
                      if (!invitee) return null
                      const inviteeRole = sibling.created_by === sibling.client_id ? 'Designer' : 'Client'
                      return (
                        <div key={sibling.id} className="flex items-center justify-between p-3 border-2 border-black bg-white shadow-brutalist-xs">
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              src={invitee.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${invitee.username || idx}`}
                              name={invitee.full_name}
                              className="w-6 h-6 rounded-none border border-black"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase text-black leading-none">{invitee.full_name}</span>
                              <span className="text-[8px] font-bold font-mono uppercase text-slate-500 mt-0.5">{inviteeRole}</span>
                            </div>
                          </div>
                          {sibling.handshake ? (
                            <span className="text-[8.5px] font-bold font-mono bg-accent-lime text-black border border-black px-2 py-0.5 shadow-brutalist-xs uppercase">Joined</span>
                          ) : (
                            <span className="text-[8.5px] font-bold font-mono bg-accent-orange text-black border border-black px-2 py-0.5 shadow-brutalist-xs uppercase">Pending</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t-2 border-black/10 flex flex-col items-center gap-3">
              {currentUser?.id === workspace?.created_by && (
                <Button
                  onClick={handleCancelWorkspace}
                  disabled={actionLoading}
                  className="w-full max-w-md h-12 text-xs uppercase tracking-widest font-black bg-accent-orange border-2 border-black text-black hover:bg-red-500 hover:text-white transition-all shadow-brutalist active:translate-y-0.5 active:shadow-brutalist-sm mb-2"
                >
                  Cancel Workspace Project
                </Button>
              )}
              {workspace.status === 'refunded' ? (
                <div className="text-center space-y-3 w-full max-w-md select-none">
                  <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-none shadow-brutalist-sm text-left space-y-2">
                    <p className="text-xs font-black uppercase text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Proyek Telah Ditolak / Dibatalkan
                    </p>
                    <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                      Tawaran proyek ini telah ditolak atau dibatalkan oleh salah satu pihak.
                    </p>
                  </div>
                  <Link href="/dashboard" className="block w-full">
                    <Button className="w-full mt-2 bg-black text-white font-black uppercase shadow-brutalist">
                      Kembali ke Dashboard
                    </Button>
                  </Link>
                </div>
              ) : workspace.status === 'pending' ? (
                !workspace.handshake ? (
                  isCreator ? (
                    <div className="text-center space-y-4 w-full max-w-md select-none">
                      <div className="p-4 bg-accent-yellow border-2 border-black rounded-none shadow-brutalist-sm text-left space-y-1.5">
                        <p className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 shrink-0" />
                          Permintaan Proyek Baru Masuk
                        </p>
                        <p className="text-[11px] text-slate-900 leading-relaxed font-semibold">
                          Klien telah mengajukan tawaran proyek ini. Silakan tinjau brief di atas dan klik tombol di bawah untuk menyetujui pengerjaan.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        <Button
                          onClick={handleHandshake}
                          disabled={actionLoading}
                          className="w-full h-12 text-xs uppercase tracking-widest font-black bg-accent-lime border-2 border-black text-black hover:bg-emerald-400 transition-all shadow-brutalist flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {actionLoading ? 'Memproses...' : '✅ Terima Proyek & Minta Pembayaran Escrow'}
                        </Button>
                        <Button
                          onClick={handleRejectProject}
                          disabled={actionLoading}
                          variant="outline"
                          className="w-full h-10 text-xs uppercase tracking-widest font-bold bg-white border-2 border-black text-rose-600 hover:bg-rose-50 transition-colors shadow-brutalist-xs"
                        >
                          ❌ Tolak Tawaran Proyek
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3 w-full max-w-md select-none">
                      <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-none shadow-brutalist-sm text-left space-y-2">
                        <p className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 shrink-0" />
                          Menunggu Persetujuan Desainer
                        </p>
                        <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                          Permintaan proyek telah terkirim ke desainer. Desainer sedang meninjau detail brief Anda. Anda belum dikenakan biaya apapun saat ini.
                        </p>
                        <p className="text-[10px] text-amber-700 font-mono">
                          💡 Begitu desainer menyetujui tawaran, Anda akan menerima pesan notifikasi di Inbox untuk menyelesaikan pembayaran ke Rekening Bersama (Escrow).
                        </p>
                      </div>
                      <Button
                        onClick={handleRejectProject}
                        disabled={actionLoading}
                        variant="outline"
                        className="w-full h-10 text-xs uppercase tracking-widest font-bold bg-white border-2 border-black text-rose-600 hover:bg-rose-50 transition-colors shadow-brutalist-xs"
                      >
                        ❌ Batalkan Permintaan Proyek Ini
                      </Button>
                    </div>
                  )
                ) : (
                  isClient ? (
                    <div className="text-center space-y-3 w-full max-w-md select-none">
                      <div className="p-3 bg-accent-lime border-2 border-black text-left shadow-brutalist-xs">
                        <p className="text-xs font-black uppercase text-black">
                          🎉 Desainer Telah Menyetujui Proyek Ini!
                        </p>
                        <p className="text-[11px] text-slate-900 mt-0.5 font-medium">
                          Silakan selesaikan pembayaran ke Rekening Bersama (Escrow) agar workspace aktif dan pengerjaan dapat langsung dimulai.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        <Button
                          onClick={handleFundProject}
                          disabled={actionLoading}
                          noBounce
                          className="w-full h-12 text-xs uppercase tracking-widest font-black bg-black text-white hover:bg-slate-800 transition-colors shadow-brutalist flex items-center justify-center gap-2"
                        >
                          {actionLoading ? 'Menyiapkan Pembayaran...' : '💳 Bayar Sekarang (Pakasir / Escrow)'}
                        </Button>
                        <Button
                          onClick={handleVerifyPayment}
                          disabled={actionLoading}
                          className="w-full h-10 text-xs uppercase tracking-widest font-black bg-accent-yellow border-2 border-black text-black hover:bg-accent-lime transition-all shadow-brutalist flex items-center justify-center gap-2"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                          {actionLoading ? 'Memeriksa Status...' : 'Sudah Bayar? Periksa Status'}
                        </Button>
                        <Button
                          onClick={handleRejectProject}
                          disabled={actionLoading}
                          variant="outline"
                          className="w-full h-10 text-xs uppercase tracking-widest font-bold bg-white border-2 border-black text-rose-600 hover:bg-rose-50 transition-colors shadow-brutalist-xs"
                        >
                          ❌ Batalkan Proyek Ini
                        </Button>
                      </div>

                      {/* Alur Aman Rekber Guarantee */}
                      <div className="p-4 bg-accent-yellow border-2 border-black rounded-none shadow-brutalist-sm space-y-2.5 text-black text-left mt-3">
                        <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
                          <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 shrink-0" />
                            Alur Aman Rekber
                          </p>
                          <span className="text-[8px] font-mono font-bold bg-black text-white px-2 py-0.5 uppercase tracking-wider">
                            100% Proteksi
                          </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-none border border-black bg-white flex items-center justify-center font-mono font-black text-[9px] shrink-0 shadow-brutalist-xs">1</span>
                            <p className="text-[10px] leading-tight font-semibold">Dana aman tersimpan di platform saat pembayaran selesai.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-none border border-black bg-white flex items-center justify-center font-mono font-black text-[9px] shrink-0 shadow-brutalist-xs">2</span>
                            <p className="text-[10px] leading-tight font-semibold">Desainer mengerjakan pesanan &amp; upload hasil kerja di Workspace.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-none border border-black bg-white flex items-center justify-center font-mono font-black text-[9px] shrink-0 shadow-brutalist-xs">3</span>
                            <p className="text-[10px] leading-tight font-semibold">Dana dicairkan ke desainer hanya setelah Anda puas &amp; menyetujui hasil.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3 w-full max-w-md select-none">
                      <div className="p-4 bg-blue-50 border-2 border-blue-400 rounded-none shadow-brutalist-sm text-left space-y-2">
                        <p className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                          Anda Telah Menyetujui Proyek Ini
                        </p>
                        <p className="text-[11px] text-blue-900 leading-relaxed font-medium">
                          Notifikasi pembayaran telah dikirim ke klien. Menunggu klien menyelesaikan pembayaran Escrow sebelum fitur pengerjaan &amp; chat workspace terbuka.
                        </p>
                      </div>
                      <Button
                        onClick={handleRejectProject}
                        disabled={actionLoading}
                        variant="outline"
                        className="w-full h-10 text-xs uppercase tracking-widest font-bold bg-white border-2 border-black text-rose-600 hover:bg-rose-50 transition-colors shadow-brutalist-xs"
                      >
                        ❌ Batalkan &amp; Tolak Proyek Ini
                      </Button>
                    </div>
                  )
                )
              ) : (
                myPendingRow ? (
                  <div className="text-center space-y-3 w-full max-w-md">
                    <p className="text-[10px] font-mono font-bold text-slate-800 uppercase">You have been invited! Accept terms below to enter workspace.</p>
                    <Button
                      onClick={handleHandshake}
                      disabled={actionLoading}
                      className="w-full h-12 text-xs uppercase tracking-widest font-black bg-accent-yellow border-2 border-black text-black hover:bg-accent-lime transition-colors shadow-brutalist"
                    >
                      {actionLoading ? 'Joining...' : 'Accept Invitation & Start Workspace'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-[10px] font-mono font-bold text-slate-800 uppercase flex items-center gap-2">
                    <span className="w-2 h-2 bg-accent-orange animate-pulse border border-black shadow-brutalist-sm rounded-full" />
                    Waiting for all invitees to accept. Collaboration features will unlock immediately.
                  </div>
                )
              )}
            </div>
          </Card>
      ) : (
        <div className="flex flex-col flex-grow min-h-0 h-full overflow-hidden">
          {/* Top fixed Header */}
          <div className="flex-none flex items-center p-3 border-2 border-black bg-white shadow-brutalist-sm mb-3 select-none">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile hamburger toggle - only visible on small screens */}
              <button
                onClick={() => setShowMobileSidebar(prev => !prev)}
                className="md:hidden w-7 h-7 flex items-center justify-center border-2 border-black bg-white text-black shadow-brutalist-xs shrink-0"
                aria-label="Toggle menu"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>

              <div className="min-w-0">
                <h1 className="text-xs md:text-sm font-black uppercase tracking-tight truncate text-black flex items-center gap-2">
                  <span className="truncate">{activeWS.title || "Workspace"}</span>
                  <span className="text-[10px] text-accent-purple font-mono font-bold font-semibold normal-case shrink-0">#{activeWS.id.slice(0, 8)}</span>
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className={`inline-block text-[9px] font-black font-mono uppercase text-white px-1.5 py-0.5 border border-black shadow-brutalist-xs shrink-0 ${
                    mockActiveWorkspace ? 'bg-slate-500' : 
                    isClient ? 'bg-accent-orange' : 
                    isCreator ? 'bg-accent-purple' : 'bg-slate-500'
                  }`}>
                    {mockActiveWorkspace ? 'Simulated' : isClient ? 'Client Portal' : isCreator ? 'Designer Desk' : 'Admin Panel'}
                  </p>
                  {statusBadge}
                </div>
              </div>
            </div>
          </div>

          {/* Main workspace layout with resizable Left Sidebar */}
          <div className="flex-grow flex flex-row min-h-0 w-full overflow-hidden relative select-none">

            {/* Mobile sidebar backdrop — always in DOM, transitions opacity */}
            <div
              className={[
                "absolute inset-0 bg-black/40 z-30 md:hidden transition-opacity duration-300",
                showMobileSidebar ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
              ].join(" ")}
              onClick={() => setShowMobileSidebar(false)}
            />

            {/* A. LEFTMOST RESIZABLE SIDEBAR — always in DOM on mobile, transitions translate+opacity */}
            <div
              style={{ width: `${sidebarWidth}px`, minWidth: '250px' }}
              className={[
                "flex flex-col border-2 border-black bg-white rounded-none overflow-y-auto overflow-x-hidden select-none",
                // Desktop: always visible in normal flex flow
                "md:relative md:h-full md:translate-x-0 md:opacity-100 md:pointer-events-auto",
                // Mobile: absolute overlay with slide+fade transitions
                "absolute top-0 left-0 h-full z-40 transition-all duration-300 ease-out transform",
                showMobileSidebar
                  ? "translate-x-0 opacity-100 pointer-events-auto"
                  : "-translate-x-full opacity-0 pointer-events-none",
              ].join(" ")}
            >

              {/* Menu options & Accordion */}
              <div className="p-3 space-y-2 flex-none select-none">

                {/* Back to Dashboard button */}
                <Link href="/dashboard" className="block w-fit">
                  <button
                    type="button"
                    className="w-fit flex items-center gap-2.5 px-3 py-2 border-2 border-black shadow-brutalist-xs text-xs font-mono font-black uppercase transition-all cursor-pointer bg-white text-black hover:bg-accent-lime hover:-translate-y-0.5 active:translate-y-0 select-none"
                    title="Kembali ke Dashboard"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>Dashboard</span>
                  </button>
                </Link>

                {/* 1. Flat Chat Rooms List */}
                <div className="w-full flex flex-col space-y-1.5">
                  {/* General Channel */}
                  <div
                    onClick={() => {
                      setActiveChannel({ type: 'general' })
                      setActiveTab('chat')
                      setShowMobileSidebar(false)
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 border-2 text-xs font-mono font-black uppercase transition-all cursor-pointer ${activeTab === 'chat' && activeChannel.type === 'general'
                      ? 'bg-accent-lime border-black shadow-brutalist-sm text-black font-bold'
                      : 'border-transparent hover:bg-slate-100 hover:border-black hover:shadow-brutalist-sm bg-white text-slate-800 font-semibold'
                      }`}
                  >
                    <MessageSquare className="w-4 h-4 text-black shrink-0" />
                    <span>General Chat</span>
                  </div>

                  {/* DM Partners List */}
                  {uniqueParticipants.map(partner => {
                    const isActive = activeTab === 'chat' && activeChannel.type === 'dm' && activeChannel.userId === partner.id
                    return (
                      <div
                        key={partner.id}
                        onClick={() => {
                          setActiveChannel({ type: 'dm', userId: partner.id })
                          setActiveTab('chat')
                          setShowMobileSidebar(false)
                        }}
                        className={`w-full flex items-center gap-3 p-2.5 border-2 text-xs font-mono font-black uppercase transition-all cursor-pointer ${isActive
                          ? 'bg-accent-lime border-black shadow-brutalist-sm text-black font-bold'
                          : 'border-transparent hover:bg-slate-100 hover:border-black hover:shadow-brutalist-sm bg-white text-slate-800 font-semibold'
                          }`}
                      >
                        <UserAvatar
                          src={partner.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${partner.username || partner.id}`}
                          name={partner.full_name}
                          className="w-4 h-4 rounded-none border border-black shrink-0"
                        />
                        <span className="truncate">{partner.full_name}</span>
                      </div>
                    )
                  })}
                </div>

                {/* 2. Explorer Accordion Item */}
                <div className="w-full flex flex-col">
                  <div
                    className={`w-full border-2 border-black text-xs font-mono font-black uppercase transition-all ${activeTab === 'explorer'
                      ? 'bg-accent-lime border-black shadow-brutalist-sm text-black'
                      : 'hover:bg-slate-100 hover:border-black hover:shadow-brutalist-sm bg-white text-slate-800'
                      }`}
                  >
                    <div
                      onClick={() => {
                        setActiveTab('explorer')
                        setIsFileExplorerExpanded(true)
                        setShowMobileSidebar(false)
                      }}
                      className="w-full flex items-center justify-between p-2.5 cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <Folder className="w-4 h-4 text-black shrink-0 animate-pulse" />
                        Explorer
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setIsFileExplorerExpanded(true)
                              setIsCreatingFolder(true)
                              setIsCreatingFile(false)
                              setNewItemName('')
                            }}
                            className="p-1 border border-black hover:bg-slate-100 bg-white text-black animate-none hover:scale-105 transition-transform"
                            title="New Folder"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setIsFileExplorerExpanded(true)
                              setIsCreatingFile(true)
                              setIsCreatingFolder(false)
                              setNewItemName('')
                            }}
                            className="p-1 border border-black hover:bg-slate-100 bg-white text-black animate-none hover:scale-105 transition-transform"
                            title="New File"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setIsFileExplorerExpanded(true)
                              triggerFileUpload()
                            }}
                            className="p-1 border border-black hover:bg-slate-100 bg-white text-black animate-none hover:scale-105 transition-transform btn-bounce"
                            title="Upload PDF or Images"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 text-black shrink-0 transition-transform ${isFileExplorerExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {/* Progress Bar Row inside the container, below the text and action icons */}
                    <div className="px-2.5 pb-2.5 select-none" title={`Storage footprint: ${storagePercent.toFixed(1)}%`}>
                      <div className="w-full h-1 bg-white border border-black rounded-none overflow-hidden">
                        <div
                          style={{ width: `${storagePercent}%` }}
                          className={`h-full transition-all duration-300 ${storagePercent >= 90 ? 'bg-red-500 animate-pulse' : 'bg-black'}`}
                        />
                      </div>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleCustomFileUpload(file)
                    }}
                    accept=".pdf,.webp,image/*"
                    className="hidden"
                  />
                  {/* Inline Storage & Files list */}
                  {isFileExplorerExpanded && (
                    <div className="pl-3.5 pr-1 py-1.5 space-y-1.5 border-l-2 border-black/15 ml-4.5 my-1 select-none">
                      {/* File Search */}
                      <div className="relative">
                        <Search className="absolute left-2 top-2 w-3 h-3 text-slate-800" />
                        <Input
                          type="text"
                          value={fileSearchQuery}
                          onChange={(e) => setFileSearchQuery(e.target.value)}
                          placeholder="Filter files..."
                          className="pl-7 h-7 text-[9px] text-black placeholder-slate-805 font-semibold"
                        />
                      </div>

                      {/* Inline Creation forms */}
                      {isCreatingFolder && (
                        <div className="flex items-center gap-1.5 p-1.5 rounded-none bg-white border border-black shadow-brutalist-sm animate-in fade-in zoom-in-95 duration-100">
                          <Folder className="w-3.5 h-3.5 text-accent-yellow fill-accent-yellow/10 shrink-0" />
                          <form onSubmit={handleCreateFolder} className="flex-1 flex items-center gap-1">
                            <Input
                              autoFocus
                              type="text"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              placeholder="Folder name..."
                              className="h-6 text-[9px] px-1.5"
                            />
                            <Button type="submit" size="sm" variant="ghost" className="h-6 w-6 p-0 border border-black rounded-none bg-accent-lime text-black">
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button type="button" onClick={() => setIsCreatingFolder(false)} size="sm" variant="ghost" className="h-6 w-6 p-0 border border-black rounded-none bg-white text-black">
                              <X className="w-3 h-3" />
                            </Button>
                          </form>
                        </div>
                      )}

                      {isCreatingFile && (
                        <div className="flex items-center gap-1.5 p-1.5 rounded-none bg-white border border-black shadow-brutalist-sm animate-in fade-in zoom-in-95 duration-100">
                          <FileCode className="w-3.5 h-3.5 text-accent-blue shrink-0" />
                          <form onSubmit={handleCreateFile} className="flex-1 flex items-center gap-1">
                            <Input
                              autoFocus
                              type="text"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              placeholder="filename.md..."
                              className="h-6 text-[9px] px-1.5"
                            />
                            <Button type="submit" size="sm" variant="ghost" className="h-6 w-6 p-0 border border-black rounded-none bg-accent-lime text-black">
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button type="button" onClick={() => setIsCreatingFile(false)} size="sm" variant="ghost" className="h-6 w-6 p-0 border border-black rounded-none bg-white text-black">
                              <X className="w-3 h-3" />
                            </Button>
                          </form>
                        </div>
                      )}

                      {/* File Tree renderer */}
                      <div className="space-y-0.5 max-h-60 overflow-y-auto pr-1">
                        {fileSearchQuery ? (
                          <div className="space-y-1">
                            {currentItems.length === 0 ? (
                              <div className="text-center py-4 text-[9px] font-mono text-slate-700 uppercase">No matching files</div>
                            ) : (
                              currentItems.map(item => {
                                const isFolder = item.type === 'folder'
                                const isActive = activeFileId === item.id
                                const isPinned = pinnedIds.includes(item.id)
                                const isUploading = item.isUploading
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => {
                                      if (isUploading) return
                                      handleItemClick(item)
                                    }}
                                    onContextMenu={(e) => {
                                      if (isUploading) {
                                        e.preventDefault()
                                        return
                                      }
                                      handleContextMenu(e, item.id)
                                    }}
                                    onTouchStart={(e) => {
                                      if (isUploading) {
                                        e.preventDefault()
                                        return
                                      }
                                      handleTouchStart(e, item.id)
                                    }}
                                    onTouchMove={isUploading ? undefined : handleTouchMove}
                                    onTouchEnd={isUploading ? undefined : handleTouchEnd}
                                    className={`group flex items-center justify-between p-1.5 rounded-none border border-black/15 transition-all ${
                                      isUploading
                                        ? 'opacity-70 cursor-not-allowed bg-slate-50'
                                        : 'cursor-pointer bg-white hover:bg-slate-50'
                                    } ${isActive ? 'bg-accent-lime/10 border-accent-lime font-bold' : ''}`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {isUploading ? (
                                        <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin shrink-0" />
                                      ) : isFolder ? (
                                        <Folder className="w-3.5 h-3.5 text-accent-yellow fill-accent-yellow/10 shrink-0" />
                                      ) : item.fileType === 'md' ? (
                                        <FileCode className="w-3.5 h-3.5 text-accent-blue shrink-0" />
                                      ) : item.fileType === 'pdf' ? (
                                        <FileText className="w-3.5 h-3.5 text-accent-orange shrink-0" />
                                      ) : (
                                        <ImageIcon className="w-3.5 h-3.5 text-accent-lime shrink-0" />
                                      )}
                                      <span className={`text-[10px] font-bold text-slate-900 truncate ${isUploading ? 'text-slate-550 italic font-medium' : ''}`}>
                                        {item.name} {isUploading && '(Uploading...)'}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        ) : (
                          renderTree('root')
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Workspace Details Item */}
                <button
                  onClick={() => { setActiveTab('details'); setShowMobileSidebar(false) }}
                  className={`w-full flex items-center gap-3 p-2.5 border-2 text-xs font-mono font-black uppercase transition-all ${activeTab === 'details'
                    ? 'bg-accent-lime border-black shadow-brutalist-sm text-black'
                    : 'border-transparent hover:bg-slate-100 hover:border-black hover:shadow-brutalist-sm bg-white text-slate-800'
                    }`}
                >
                  <Briefcase className="w-4 h-4 text-black shrink-0" />
                  Workspace Details
                </button>

                {/* 4. Deliverables Item */}
                <button
                  onClick={() => { setActiveTab('results'); setShowMobileSidebar(false) }}
                  className={`w-full flex items-center gap-3 p-2.5 border-2 text-xs font-mono font-black uppercase transition-all ${activeTab === 'results'
                    ? 'bg-accent-yellow border-black shadow-brutalist-sm text-black'
                    : 'border-transparent hover:bg-slate-100 hover:border-black hover:shadow-brutalist-sm bg-white text-slate-800'
                    }`}
                >
                  <FileCheck2 className="w-4 h-4 text-black shrink-0" />
                  Deliverables
                </button>

              </div>

              {pinnedIds.length > 0 && (
                <>
                  {/* Divider */}
                  <div className="border-t-2 border-black/10 my-1 flex-none" />

                  {/* Pinned Items section */}
                  <div className="p-3 pb-1 flex-none select-none">
                    <h3 className="text-[10px] font-black font-mono text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                      <Pin className="w-3 h-3 text-black shrink-0" />
                      Pinned Items
                    </h3>
                  </div>

                  {/* Pinned items options list */}
                  <div className="p-3 pt-0 space-y-1.5 flex-none">
                    {pinnedIds.map(itemId => {
                      const item = fileSystem[itemId]
                      if (!item) return null
                      const isFolder = item.type === 'folder'
                      const isActive = activeFileId === item.id
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setIsFileExplorerExpanded(true)
                            if (isFolder) {
                              setCurrentFolderId(item.id)
                              setExpandedFolders(prev => ({ ...prev, [item.id]: true }))
                            } else {
                              handleItemClick(item)
                            }
                          }}
                          className={`group flex items-center justify-between p-2 border-2 text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${isActive
                            ? 'bg-accent-purple text-white border-black shadow-brutalist-sm'
                            : 'border-transparent hover:bg-slate-100 hover:border-black hover:shadow-brutalist-sm bg-white text-slate-905'
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isFolder ? (
                              <Folder className="w-3.5 h-3.5 text-accent-yellow fill-accent-yellow/10 shrink-0" />
                            ) : item.fileType === 'md' ? (
                              <FileCode className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-accent-blue'}`} />
                            ) : item.fileType === 'pdf' ? (
                              <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-accent-orange'}`} />
                            ) : (
                              <ImageIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-accent-lime'}`} />
                            )}
                            <span className="truncate text-left">{item.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePin(item.id)
                            }}
                            className={`p-0.5 border border-transparent rounded-none shrink-0 ${isActive ? 'text-white hover:text-red-300' : 'text-slate-500 hover:text-red-500'
                              }`}
                            title="Unpin"
                          >
                            <Pin className="w-3 h-3 fill-current" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Splitter border handler on Left Sidebar - desktop only */}
              <div
                onMouseDown={startResizeSidebar}
                className="hidden md:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-accent-purple/50 active:bg-accent-purple transition-colors z-20"
              />
            </div>

            {/* B. CENTER COLUMN (ACTIVE VIEWPORT) */}
            <div className="flex-grow flex flex-col min-h-0 h-full overflow-hidden md:pl-4">

              {activeTab === 'chat' && (
                <div className="w-full h-full flex border-2 border-black bg-white rounded-none overflow-hidden shadow-brutalist animate-in fade-in-50 duration-200">
                  <div className="w-full flex flex-col h-full bg-white">
                    <div className="px-3 py-2 border-b-2 border-black bg-slate-50 flex-none flex justify-between items-center select-none">
                      <span className="text-[9.5px] font-bold font-mono text-black uppercase truncate">
                        Active Room: {activeChannel.type === 'general' ? 'General Chat' : `DM with ${chatPartnerName}`}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse border border-black" />
                        <span className="text-[8px] font-mono text-black font-bold uppercase">Online</span>
                      </span>
                    </div>

                    {/* Message Feed */}
                    <div className="flex-grow overflow-y-auto p-3 space-y-3 bg-slate-50/10 min-h-0">
                      {messages.map((msg) => {
                        const isMe = msg.sender === 'me' || (msg.senderId && msg.senderId === currentUser?.id)
                        const isSystem = msg.sender === 'system'

                        if (isSystem) {
                          return (
                            <div key={msg.id} className="text-center py-1 bg-slate-100 border border-black/10 text-[9px] font-mono text-black uppercase font-bold tracking-wide select-none">
                              {msg.text}
                            </div>
                          )
                        }

                        const senderName = msg.senderName || (isMe ? 'Me' : 'Partner')
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[90%] ${isMe ? 'ml-auto' : 'mr-auto'}`}
                          >
                            {!isMe && (
                              <span className="text-[8px] font-black uppercase text-black mb-0.5 ml-0.5">{senderName}</span>
                            )}
                            <div
                              className={`p-2.5 rounded-none text-[11px] leading-relaxed border-2 border-black font-sans shadow-brutalist-sm ${isMe
                                ? 'bg-black text-white border-black shadow-none'
                                : 'bg-accent-lime text-black border-black font-semibold'
                                }`}
                            >
                              {msg.text}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[8px] font-mono font-bold uppercase text-black">
                              <span>{msg.time}</span>
                              {isMe && <CheckCheck className="w-3 h-3 text-black inline shrink-0" />}
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input Area */}
                    <div className="p-2.5 border-t-2 border-black bg-slate-50 flex-none">
                      <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
                        <Input
                          type="text"
                          value={inputVal}
                          onChange={(e) => setInputVal(e.target.value)}
                          placeholder="Type message..."
                          className="flex-1 h-8 text-[11px] px-2.5 text-black placeholder-slate-800 font-semibold"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="sentences"
                          inputMode="text"
                          spellCheck="false"
                        />
                        <Button
                          type="submit"
                          variant="default"
                          className="h-8 w-8 p-0 flex items-center justify-center shrink-0 shadow-brutalist-sm bg-black border-2 border-black hover:bg-accent-lime hover:text-black text-white"
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'explorer' && (
                <div className="w-full h-full flex border-2 border-black bg-white rounded-none overflow-hidden shadow-brutalist animate-in fade-in-50 duration-200">
                  {renderFileExplorer()}
                </div>
              )}

              {activeTab === 'details' && (
                <div className="w-full h-full flex flex-col border-2 border-black bg-white rounded-none overflow-y-auto p-6 shadow-brutalist space-y-6 animate-in fade-in-50 duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black flex-none">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border-2 border-black bg-accent-lime flex items-center justify-center shadow-brutalist-sm shrink-0">
                        <Briefcase className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-wider text-black">Workspace Financials &amp; Terms</h2>
                        <p className="text-[8.5px] font-bold font-mono text-black uppercase tracking-widest mt-0.5">Secure Escrow Protection Vault</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-none">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-black">Escrow Terms</h3>
                      <div className="space-y-2.5 font-mono text-xs text-black">
                        <div className="flex justify-between items-center bg-slate-50 border border-black p-2.5 shadow-brutalist-xs">
                          <span className="font-bold uppercase">Contract Budget:</span>
                          <span className="font-black bg-white border border-black px-2 py-0.5">Rp {(activeWS.amount || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 border border-black p-2.5 shadow-brutalist-xs">
                          <span className="font-bold uppercase">Vault Storage Space:</span>
                          <span className="font-black bg-white border border-black px-2 py-0.5">{formatSize(usedStorage)} / 10.0 MB ({storagePercent.toFixed(1)}%)</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 border border-black p-2.5 shadow-brutalist-xs">
                          <span className="font-bold uppercase">Revisions Tracker:</span>
                          <span className="font-bold bg-white border border-black px-2 py-0.5">
                            {activeWS.revisions_used !== undefined ? activeWS.revisions_used : 0} / {activeWS.revisions || 0} cycles used
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 border border-black p-2.5 shadow-brutalist-xs">
                          <span className="font-bold uppercase">Vault Security Status:</span>
                          <span className={`${statusColor} font-black uppercase text-[10px]`}>{statusText}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-black">Project Status &amp; Controls</h3>
                      <div className="p-4 border-2 border-black bg-slate-50/50 shadow-brutalist-sm flex flex-col justify-center items-center text-center space-y-3 min-h-[120px]">
                        <p className="text-[10px] font-bold font-mono uppercase text-black">
                          Escrow Actions Available for your role
                        </p>
                        <div className="flex flex-wrap gap-2.5 justify-center">
                          {renderEscrowActions()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-black pt-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-black mb-3">Workspace Brief &amp; Specifications</h3>
                    <div className="bg-[#FAF9F6] border-2 border-black p-5 shadow-brutalist-sm">
                      <p className="text-[11px] text-black leading-relaxed font-sans font-semibold whitespace-pre-wrap">
                        {activeWS.brief || "No project brief was provided. Please align with your workspace partner via Chat Room."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'results' && (
                <div className="w-full h-full flex flex-col min-h-0 space-y-4 animate-in fade-in-50 duration-200 overflow-y-auto p-4 md:p-6 bg-[#FAF9F6] border-2 border-black shadow-brutalist">
                  {/* Status Banner */}
                  <div className="bg-white border-2 border-black p-5 shadow-brutalist-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2.5 py-0.5 border-2 text-[10px] font-mono font-black uppercase tracking-wider ${
                            activeWS.status === 'released' 
                              ? 'bg-accent-lime text-black border-black' 
                              : activeWS.deliverable_file 
                                ? 'bg-accent-yellow text-black border-black' 
                                : 'bg-slate-100 text-slate-700 border-black'
                          }`}>
                            {activeWS.status === 'released' 
                              ? '✓ Proyek Selesai & Dana Dicairkan' 
                              : activeWS.deliverable_file 
                                ? '★ Deliverables Siap Direview' 
                                : '⏳ Menunggu Pengunggahan Hasil'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                            Revisi: {activeWS.revisions_used}/{activeWS.revisions} Digunakan
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-black uppercase text-black">
                          Deliverables
                        </h2>
                        <p className="text-xs text-slate-600 font-semibold mt-0.5">
                          {activeWS.status === 'released'
                            ? 'Proyek ini telah rampung. Semua file hasil karya aman tersimpan dan hak milik telah diserahkan.'
                            : activeWS.deliverable_file
                              ? 'Desainer telah mengunggah hasil karya. Silakan unduh/periksa sebelum menyetujui pelepasan dana.'
                              : 'Desainer sedang mengerjakan pesanan. File final akan ditampilkan di sini setelah diunggah.'}
                        </p>
                      </div>

                      {/* Quick action badges or download */}
                      {activeWS.deliverable_file && (
                        activeWS.status === 'released' || isCreator ? (
                          <a
                            href={activeWS.deliverable_file}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-lime text-black hover:bg-emerald-400 text-xs font-mono font-black uppercase tracking-wider border-2 border-black shadow-brutalist transition-transform active:translate-y-0.5 shrink-0"
                          >
                            <Download className="w-4 h-4" />
                            Unduh File Master
                          </a>
                        ) : (
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <button
                              type="button"
                              disabled
                              title="Tombol unduh terkunci demi proteksi desainer. Tombol akan aktif setelah Anda menyetujui hasil karya."
                              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-400 text-xs font-mono font-black uppercase tracking-wider border-2 border-slate-300 shadow-none cursor-not-allowed select-none"
                            >
                              <Lock className="w-4 h-4 text-slate-400" />
                              Unduh Terkunci (Perlu Approval)
                            </button>
                            <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5">
                              🔒 Setujui hasil untuk membuka unduhan
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    {/* Quick project info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs font-mono">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Nilai Escrow</span>
                        <span className="font-black text-black">Rp {Number(activeWS.amount || 0).toLocaleString('id-ID')}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Klien</span>
                        <span className="font-bold text-black truncate block">{activeWS.client?.full_name || 'Klien'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Desainer</span>
                        <span className="font-bold text-black truncate block">{activeWS.creator?.full_name || 'Desainer'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Sisa Revisi</span>
                        <span className="font-black text-accent-purple">{Math.max(0, (activeWS.revisions || 0) - (activeWS.revisions_used || 0))} Kali</span>
                      </div>
                    </div>
                  </div>

                  {/* Main Deliverable Preview & Files */}
                  <div className="bg-white border-2 border-black p-5 shadow-brutalist-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center justify-between border-b-2 border-black pb-2">
                      <span className="flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-black" />
                        Preview File Hasil Akhir
                      </span>
                      {activeWS.deliverable_file && (
                        <span className={`text-[9px] font-mono font-bold border border-black px-2 py-0.5 uppercase ${
                          activeWS.status === 'released' 
                            ? 'bg-accent-lime text-black' 
                            : 'bg-accent-yellow text-black'
                        }`}>
                          {activeWS.status === 'released' ? 'Telah Disetujui' : 'Mode Pratinjau'}
                        </span>
                      )}
                    </h3>

                    {activeWS.deliverable_file ? (
                      <div className="space-y-4">
                        {/* If image deliverable */}
                        {/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(activeWS.deliverable_file) || !activeWS.deliverable_file.toLowerCase().endsWith('.pdf') ? (
                          <div className="border-2 border-black bg-slate-50 p-3 overflow-hidden flex flex-col items-center justify-center relative">
                            {activeWS.status !== 'released' && !isCreator ? (
                              /* Locked / Protected in-platform preview for client before approval */
                              <div 
                                className="relative group w-full flex flex-col items-center select-none" 
                                onContextMenu={(e) => e.preventDefault()}
                              >
                                <img
                                  src={activeWS.deliverable_file}
                                  alt="Deliverable Preview"
                                  onDragStart={(e) => e.preventDefault()}
                                  className="max-h-[480px] w-auto object-contain mx-auto border-2 border-black/20 shadow-sm pointer-events-none select-none"
                                />
                                <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 border-2 border-amber-400 text-amber-950 text-[10px] font-mono font-bold uppercase shadow-brutalist-xs">
                                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                  <span>Mode Pratinjau Terproteksi · File master resolusi penuh terbuka setelah disetujui</span>
                                </div>
                              </div>
                            ) : (
                              /* Released or Designer mode: full resolution access and download */
                              <>
                                <a href={activeWS.deliverable_file} target="_blank" rel="noopener noreferrer" className="block max-h-[500px] overflow-auto">
                                  <img
                                    src={activeWS.deliverable_file}
                                    alt="Deliverable Preview"
                                    className="max-h-[480px] w-auto object-contain mx-auto border border-black/20 shadow-sm"
                                  />
                                </a>
                                <p className="text-[10px] font-mono text-slate-500 mt-2">
                                  Klik gambar untuk melihat resolusi penuh di tab baru.
                                </p>
                              </>
                            )}
                          </div>
                        ) : (
                          /* If PDF or document */
                          <div className="p-8 border-2 border-dashed border-black bg-slate-50 flex flex-col items-center justify-center text-center space-y-3">
                            <FileText className="w-12 h-12 text-accent-purple" />
                            <div>
                              <p className="font-black text-sm text-black uppercase font-mono">Dokumen Deliverables (PDF)</p>
                              <p className="text-xs text-slate-600 mt-1">
                                {activeWS.status === 'released' || isCreator
                                  ? 'File deliverable siap diakses.'
                                  : 'Dokumen terproteksi. File PDF master akan dapat dibuka/diunduh setelah Anda menyetujui hasil karya.'}
                              </p>
                            </div>
                            {activeWS.status === 'released' || isCreator ? (
                              <a
                                href={activeWS.deliverable_file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-accent-lime text-black border-2 border-black font-mono font-bold text-xs uppercase shadow-brutalist-xs"
                              >
                                Buka Dokumen PDF
                              </a>
                            ) : (
                              <span className="px-4 py-2 bg-slate-200 text-slate-500 border-2 border-slate-300 font-mono font-bold text-xs uppercase flex items-center gap-1.5 cursor-not-allowed">
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                                Akses PDF Terkunci (Setujui Dahulu)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty state */
                      <div className="border-2 border-dashed border-black p-8 text-center bg-slate-50 space-y-3">
                        <Clock className="w-10 h-10 text-slate-400 mx-auto" />
                        <div>
                          <p className="text-xs font-black uppercase text-black">Belum Ada File Hasil yang Diunggah</p>
                          <p className="text-[11px] text-slate-600 max-w-md mx-auto mt-1">
                            {isCreator
                              ? 'Anda bertindak sebagai desainer. Unggah file deliverables final (logo, banner, mockup, dll) melalui tombol di bawah.'
                              : 'Desainer sedang mengerjakan pesanan Anda. File deliverable akan langsung muncul di sini setelah diunggah.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Designer upload area */}
                    {isCreator && activeWS.status === 'escrow' && (
                      <div className="pt-4 border-t-2 border-black">
                        <p className="text-xs font-black uppercase text-black mb-2 flex items-center gap-1.5">
                          <Upload className="w-4 h-4" />
                          {activeWS.deliverable_file ? 'Unggah Versi Revisi / File Baru' : 'Unggah Deliverables (Max 10MB)'}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <input
                            type="file"
                            id="results-deliverable-upload"
                            accept="image/*,.pdf"
                            disabled={uploading}
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleCustomFileUpload(e.target.files[0], true)
                              }
                            }}
                            className="text-xs file:mr-3 file:py-2 file:px-4 file:border-2 file:border-black file:text-xs file:font-black file:uppercase file:bg-white file:text-black hover:file:bg-slate-100 cursor-pointer w-full"
                          />
                          {uploading && (
                            <span className="text-xs font-mono font-bold text-black uppercase animate-pulse shrink-0">
                              Mengunggah...
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Client Approval Actions Card */}
                  {isClient && activeWS.status === 'escrow' && activeWS.handshake && (
                    <div className="bg-white border-2 border-black p-5 shadow-brutalist space-y-4">
                      <div className="border-b-2 border-black pb-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          Keputusan Klien (Persetujuan &amp; Pencairan Dana)
                        </h3>
                        <p className="text-xs text-slate-600 font-semibold mt-1">
                          Periksa hasil kerja desainer dengan teliti. Dana Escrow sebesar <span className="font-bold text-black font-mono">Rp {Number(activeWS.amount || 0).toLocaleString('id-ID')}</span> saat ini aman tersimpan di platform Sarena.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Approve Box */}
                        <div className="p-4 bg-accent-lime/20 border-2 border-black flex flex-col justify-between space-y-3">
                          <div>
                            <p className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                              <Check className="w-4 h-4 text-emerald-700" />
                              Puas dengan Hasil?
                            </p>
                            <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                              Selesaikan pesanan dan cairkan dana escrow ke desainer. Tindakan ini menandai proyek selesai secara resmi.
                            </p>
                          </div>
                          <Button
                            onClick={() => setShowReleaseModal(true)}
                            disabled={actionLoading || !activeWS.deliverable_file}
                            className="w-full h-11 bg-accent-lime text-black border-2 border-black hover:bg-emerald-400 font-black uppercase tracking-wider text-xs shadow-brutalist-xs"
                          >
                            {actionLoading ? 'Memproses...' : '✓ Setujui & Cairkan Dana ke Desainer'}
                          </Button>
                        </div>

                        {/* Revision Box */}
                        <div className="p-4 bg-accent-yellow/20 border-2 border-black flex flex-col justify-between space-y-3">
                          <div>
                            <p className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                              <RefreshCw className="w-4 h-4 text-amber-700" />
                              Perlu Perbaikan / Revisi?
                            </p>
                            <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                              Sisa revisi gratis: <span className="font-black font-mono text-black">{Math.max(0, (activeWS.revisions || 0) - (activeWS.revisions_used || 0))} kali</span>. Sampaikan catatan revisi kepada desainer di tab Chat.
                            </p>
                          </div>
                          {activeWS.revisions - activeWS.revisions_used > 0 ? (
                            <Button
                              onClick={() => setShowRevisionModal(true)}
                              disabled={actionLoading}
                              className="w-full h-11 bg-accent-yellow text-black border-2 border-black hover:bg-amber-300 font-black uppercase tracking-wider text-xs shadow-brutalist-xs"
                            >
                              {actionLoading ? 'Memproses...' : 'Ajukan Permintaan Revisi'}
                            </Button>
                          ) : (
                            <div className="space-y-2">
                              <Button disabled className="w-full h-11 bg-slate-200 text-slate-500 border-2 border-slate-400 font-bold uppercase text-xs cursor-not-allowed">
                                Kuota Revisi Habis
                              </Button>
                              <button
                                onClick={handleCancelRefund}
                                disabled={actionLoading}
                                className="w-full text-center text-[10px] font-mono font-bold text-red-600 hover:underline uppercase"
                              >
                                Butuh Bantuan? Ajukan Refund / Mediasi
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Always visible dispute/help link */}
                        <div className="md:col-span-2 pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-slate-500">
                            Mengalami kendala dengan desainer atau pekerjaan tidak sesuai brief?
                          </span>
                          <button
                            type="button"
                            onClick={handleCancelRefund}
                            disabled={actionLoading}
                            className="text-[10px] font-mono font-bold text-rose-600 hover:underline uppercase flex items-center gap-1 shrink-0"
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Ajukan Refund / Mediasi Escrow
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* C. RIGHT COLUMN (FILE VIEWER/EDITOR) */}
            {activeFileId && activeFile && (
              <>
                {/* MOBILE: absolute overlay within content area — below sidebar backdrop (z-30) and sidebar (z-40) */}
                <div className="md:hidden absolute inset-0 z-20 flex flex-col bg-white border-2 border-black shadow-brutalist animate-in fade-in duration-150">
                  <div className="flex-grow flex flex-col h-full min-w-0">
                    {renderFileViewer()}
                  </div>
                </div>

                {/* DESKTOP: normal resizable side panel in flex flow */}
                <div
                  style={{ width: `${explorerWidth}px` }}
                  className="hidden md:flex flex-col flex-shrink-0 h-full border-2 border-black bg-white rounded-none shadow-brutalist relative select-none ml-4 animate-in slide-in-from-right duration-250 ease-out"
                >
                  <div className="flex-grow flex flex-col h-full bg-white min-w-0">
                    {renderFileViewer()}
                  </div>
                  {/* Resize handle */}
                  <div
                    onMouseDown={startResizeExplorer}
                    className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-accent-purple/50 active:bg-accent-purple transition-colors z-20"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none bg-transparent" />
      )}

      {/* Custom Context Menu Dropdown */}
      {contextMenu.visible && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-[9999] bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] py-1 min-w-[150px] font-mono text-[9.5px] select-none"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {(() => {
            const contextItem = fileSystem[contextMenu.itemId]
            const isFolder = contextItem?.type === 'folder' || contextMenu.itemId === 'root'
            const isRoot = contextMenu.itemId === 'root'

            const isDeliverablesItem = 
              contextMenu.itemId === 'deliverables_folder' ||
              contextItem?.name?.toLowerCase() === 'deliverables' ||
              contextItem?.parentId === 'deliverables_folder' ||
              fileSystem[contextItem?.parentId]?.name?.toLowerCase() === 'deliverables' ||
              contextItem?.isDeliverable

            if (!isCreator && isDeliverablesItem) {
              if (activeWS.status !== 'released') {
                return (
                  <div className="p-2.5 text-[9px] font-mono font-bold text-amber-900 bg-amber-50 flex items-center gap-1.5 select-none">
                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Deliverables Terkunci (Perlu Approval)</span>
                  </div>
                )
              }
              if (!isFolder && contextItem?.url) {
                return (
                  <a
                    href={contextItem.url}
                    download={contextItem.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-left px-3 py-1.5 hover:bg-accent-lime hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors"
                    onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Deliverable
                  </a>
                )
              }
              return (
                <div className="p-2.5 text-[9px] font-mono font-bold text-slate-700 bg-slate-50 flex items-center gap-1.5 select-none">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Deliverables Disetujui</span>
                </div>
              )
            }

            if (isFolder) {
              return (
                <>
                  <button
                    onClick={() => {
                      setIsCreatingFile(true)
                      setIsCreatingFolder(false)
                      setNewItemName('')
                      setCurrentFolderId(contextMenu.itemId === 'root' ? 'root' : contextMenu.itemId)
                      setContextMenu(prev => ({ ...prev, visible: false }))
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-accent-lime hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors"
                  >
                    New File
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingFolder(true)
                      setIsCreatingFile(false)
                      setNewItemName('')
                      setCurrentFolderId(contextMenu.itemId === 'root' ? 'root' : contextMenu.itemId)
                      setContextMenu(prev => ({ ...prev, visible: false }))
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-accent-lime hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors"
                  >
                    New Folder
                  </button>
                  {clipboard && (
                    <button
                      onClick={() => {
                        handlePasteNode(contextMenu.itemId)
                        setContextMenu(prev => ({ ...prev, visible: false }))
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-accent-lime hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors border-t border-black/10 mt-1"
                    >
                      Paste
                    </button>
                  )}
                  {!isRoot && (
                    <>
                      <div className="border-t border-black/10 my-1" />
                      <button
                        onClick={() => {
                          handleCopyNode(contextMenu.itemId)
                          setContextMenu(prev => ({ ...prev, visible: false }))
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-accent-lime hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors"
                      >
                        Copy Folder
                      </button>
                      <button
                        onClick={() => {
                          setMoveItemId(contextMenu.itemId)
                          setSelectedFolderId(fileSystem[contextMenu.itemId]?.parentId || 'root')
                          setMoveModalOpen(true)
                          setContextMenu(prev => ({ ...prev, visible: false }))
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-accent-lime hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors"
                      >
                        Move Folder
                      </button>
                      <button
                        onClick={() => {
                          handleCloneNode(contextMenu.itemId)
                          setContextMenu(prev => ({ ...prev, visible: false }))
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-accent-lime hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors"
                      >
                        Clone Folder
                      </button>
                      <button
                        onClick={() => {
                          togglePin(contextMenu.itemId)
                          setContextMenu(prev => ({ ...prev, visible: false }))
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-accent-lime hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors"
                      >
                        {pinnedIds.includes(contextMenu.itemId) ? "Unpin Folder" : "Pin Folder"}
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteNode(contextMenu.itemId)
                          setContextMenu(prev => ({ ...prev, visible: false }))
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-accent-orange hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors text-rose-600 border-t border-black/10 mt-1"
                      >
                        Delete Folder
                      </button>
                    </>
                  )}
                </>
              )
            } else {
              return (
                <>
                  <button
                    onClick={() => {
                      handleCopyNode(contextMenu.itemId)
                      setContextMenu(prev => ({ ...prev, visible: false }))
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-accent-lime hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors"
                  >
                    Copy File
                  </button>
                  <button
                    onClick={() => {
                      setMoveItemId(contextMenu.itemId)
                      setSelectedFolderId(fileSystem[contextMenu.itemId]?.parentId || 'root')
                      setMoveModalOpen(true)
                      setContextMenu(prev => ({ ...prev, visible: false }))
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-accent-lime hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors"
                  >
                    Move File
                  </button>
                  <button
                    onClick={() => {
                      handleCloneNode(contextMenu.itemId)
                      setContextMenu(prev => ({ ...prev, visible: false }))
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-accent-lime hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors"
                  >
                    Clone File
                  </button>
                  <button
                    onClick={() => {
                      togglePin(contextMenu.itemId)
                      setContextMenu(prev => ({ ...prev, visible: false }))
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-accent-lime hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors"
                  >
                    {pinnedIds.includes(contextMenu.itemId) ? "Unpin File" : "Pin File"}
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteNode(contextMenu.itemId)
                      setContextMenu(prev => ({ ...prev, visible: false }))
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-accent-orange hover:text-black font-black uppercase flex items-center gap-1.5 transition-colors text-rose-600 border-t border-black/10 mt-1"
                  >
                    Delete File
                  </button>
                </>
              )
            }
          })()}
        </div>
      )}

      {/* Move Folder Selector Modal */}
      {moveModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b-4 border-black bg-accent-lime flex justify-between items-center select-none">
              <h3 className="text-sm font-black uppercase tracking-wider text-black">Move Item</h3>
              <button
                onClick={() => setMoveModalOpen(false)}
                className="w-6 h-6 border-2 border-black bg-white hover:bg-slate-100 flex items-center justify-center font-bold"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs">
              <p className="mb-4 font-bold text-slate-800 uppercase">
                Select destination folder for &quot;{fileSystem[moveItemId]?.name}&quot;:
              </p>
              <div className="border-2 border-black divide-y-2 divide-black max-h-[250px] overflow-y-auto bg-slate-50">
                {getFoldersList().map(folder => {
                  const isSelected = selectedFolderId === folder.id
                  const disabled = folder.id === moveItemId || isDescendant(folder.id, moveItemId)

                  return (
                    <button
                      key={folder.id}
                      disabled={disabled}
                      onClick={() => setSelectedFolderId(folder.id)}
                      style={{ paddingLeft: `${folder.depth * 12 + 12}px` }}
                      className={`w-full text-left py-2 px-3 flex items-center justify-between ${disabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-200'
                        : isSelected
                          ? 'bg-accent-lime text-black font-black'
                          : 'hover:bg-slate-150 bg-white text-black'
                        }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Folder className="w-3.5 h-3.5 shrink-0 text-accent-yellow fill-accent-yellow/10" />
                        <span className="truncate">{folder.name === 'Root' ? 'Home' : folder.name}</span>
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-black shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-4 border-black bg-slate-50 flex justify-end gap-3 flex-none select-none">
              <Button
                onClick={() => setMoveModalOpen(false)}
                variant="outline"
                className="border-2 border-black rounded-none shadow-brutalist-xs text-xs font-black uppercase"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleMoveNode(moveItemId, selectedFolderId)
                  setMoveModalOpen(false)
                }}
                disabled={!selectedFolderId}
                variant="default"
                className="border-2 border-black rounded-none shadow-brutalist-xs text-xs font-black bg-accent-lime text-black hover:bg-accent-lime/90"
              >
                Move Here
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Approve & Release Escrow Confirmation Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b-4 border-black bg-accent-lime flex justify-between items-center select-none">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-black" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                  Konfirmasi Persetujuan Desain &amp; Pencairan Dana
                </h3>
              </div>
              <button 
                onClick={() => setShowReleaseModal(false)}
                className="w-7 h-7 border-2 border-black bg-white hover:bg-rose-500 hover:text-white flex items-center justify-center font-bold shadow-brutalist-xs transition-colors"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-5 font-mono text-xs space-y-4">
              <div className="p-3 bg-amber-50 border-2 border-black space-y-2">
                <p className="font-black uppercase text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                  Peringatan Pencairan Dana Rekber (Escrow)
                </p>
                <p className="text-[11px] text-slate-800 font-medium leading-relaxed font-sans">
                  Apakah Anda yakin ingin menyetujui deliverables ini? Pastikan seluruh file deliverable telah Anda tinjau dan tidak ada revisi yang tertunda.
                </p>
              </div>

              <div className="border-2 border-black p-3 bg-slate-50 space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-700 uppercase">Proyek:</span>
                  <span className="font-black text-black">{workspace?.title}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-700 uppercase">Dana Escrow yang Dicairkan:</span>
                  <span className="font-black bg-accent-lime border border-black px-2 py-0.5 text-black">
                    Rp {(workspace?.amount || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-700 uppercase">Penerima Dana:</span>
                  <span className="font-black text-black">{workspace?.creator?.full_name || 'Desainer'}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 font-mono">
                * Setelah disetujui, dana di Rekening Bersama akan langsung dicairkan ke desainer dan status proyek akan menjadi SELESAI (Completed). Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-4 border-black bg-slate-50 flex flex-col sm:flex-row justify-end gap-3 flex-none select-none">
              <Button 
                onClick={() => setShowReleaseModal(false)}
                disabled={actionLoading}
                variant="outline"
                className="border-2 border-black rounded-none shadow-brutalist-xs text-xs font-black uppercase"
              >
                Batal
              </Button>
              <Button 
                onClick={handleApproveRelease}
                disabled={actionLoading}
                variant="default"
                className="border-2 border-black rounded-none shadow-brutalist-xs text-xs font-black bg-accent-lime text-black hover:bg-emerald-400 flex items-center justify-center gap-2"
              >
                {actionLoading ? 'Memproses Pencairan...' : '✓ Ya, Setujui & Cairkan Dana'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Request Official Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b-4 border-black bg-accent-yellow flex justify-between items-center select-none">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-black" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                  Ajukan Permintaan Revisi Resmi
                </h3>
              </div>
              <button 
                onClick={() => setShowRevisionModal(false)}
                className="w-7 h-7 border-2 border-black bg-white hover:bg-rose-500 hover:text-white flex items-center justify-center font-bold shadow-brutalist-xs transition-colors"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-5 font-mono text-xs space-y-4">
              <div className="p-3 bg-amber-50 border-2 border-black space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-700 uppercase">Siklus Revisi:</span>
                  <span className="font-black bg-accent-purple text-white border border-black px-2 py-0.5">
                    Revisi ke-{(workspace?.revisions_used || 0) + 1} dari {workspace?.revisions || 3}
                  </span>
                </div>
                <p className="text-[11px] text-slate-800 font-sans font-medium mt-1">
                  Catatan revisi ini akan langsung dikirimkan ke Chat Workspace sebagai instruksi resmi bagi desainer untuk memperbaiki karya.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-black block">
                  Rincian Catatan Revisi:
                </label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Contoh: Tolak warna latar belakang, tolong ganti dengan tone lebih gelap. Font judul diubah menjadi sans-serif..."
                  rows={4}
                  className="w-full border-2 border-black p-3 font-mono text-xs focus:outline-none focus:bg-white bg-slate-50 resize-none shadow-brutalist-xs"
                />
              </div>

              <p className="text-[10px] text-slate-500 font-mono">
                * Kuota revisi akan berkurang 1 kali. Desainer akan menerima notifikasi pengerjaan revisi secara realtime.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-4 border-black bg-slate-50 flex flex-col sm:flex-row justify-end gap-3 flex-none select-none">
              <Button 
                onClick={() => setShowRevisionModal(false)}
                disabled={actionLoading}
                variant="outline"
                className="border-2 border-black rounded-none shadow-brutalist-xs text-xs font-black uppercase"
              >
                Batal
              </Button>
              <Button 
                onClick={() => handleRequestRevision(revisionNotes)}
                disabled={actionLoading || !revisionNotes.trim()}
                variant="default"
                className="border-2 border-black rounded-none shadow-brutalist-xs text-xs font-black bg-accent-yellow text-black hover:bg-amber-300 flex items-center justify-center gap-2"
              >
                {actionLoading ? 'Mengirim...' : 'Kirim Permintaan Revisi'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div className="prose prose-sm max-w-full font-mono text-[10px] leading-relaxed text-black space-y-2 select-text w-full">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('# ')) {
          return <h1 key={idx} className="text-sm font-black uppercase border-b border-black pb-1 mt-3 mb-1 text-black">{trimmed.slice(2)}</h1>
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={idx} className="text-xs font-black uppercase mt-2.5 mb-1 text-black">{trimmed.slice(3)}</h2>
        }
        if (trimmed.startsWith('### ')) {
          return <h3 key={idx} className="text-[10px] font-bold uppercase mt-2 mb-0.5 text-black">{trimmed.slice(4)}</h3>
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <ul key={idx} className="list-disc list-inside pl-2 space-y-0.5 text-black">
              <li>{parseInlineMarkdown(trimmed.slice(2))}</li>
            </ul>
          )
        }
        if (trimmed === '') {
          return <div key={idx} className="h-1.5" />
        }
        return <p key={idx} className="text-slate-800 leading-relaxed">{parseInlineMarkdown(trimmed)}</p>
      })}
    </div>
  )
}

function parseInlineMarkdown(text) {
  const parts = text.split('**')
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-bold text-black">{part}</strong>
    }
    return part
  })
}
