'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { studioApi, newsApi, profileApi, mediaApi, carouselApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const IMAGE_STYLES = [
  {
    id: 'editorial',
    name: 'Editorial Photography',
    badge: 'Realism',
    icon: '📸',
    desc: 'Cinematic studio lighting, shallow depth of field, premium photographic realism'
  },
  {
    id: 'tech_illustration',
    name: 'Tech Illustration',
    badge: '3D Isometric',
    icon: '⚡',
    desc: 'Isometric 3D, modular architecture, refined cyber-software elements'
  },
  {
    id: 'business_illustration',
    name: 'Business Illustration',
    badge: 'Corporate',
    icon: '💼',
    desc: 'Contemporary corporate palette, strategic collaboration motifs, clean geometric silhouettes'
  },
  {
    id: 'news_graphic',
    name: 'News Graphic',
    badge: 'Editorial',
    icon: '📰',
    desc: 'High-impact editorial graphic, dynamic focal point, breaking news aesthetic'
  },
  {
    id: 'data_visual',
    name: 'Data Visual',
    badge: 'Abstract Data',
    icon: '📊',
    desc: 'Abstract 3D data visualization, glowing interconnected nodes, chart geometry'
  },
  {
    id: 'minimalist_concept',
    name: 'Minimalist Concept',
    badge: 'Swiss / Bauhaus',
    icon: '🎨',
    desc: 'Swiss Bauhaus design inspired, stark geometric shapes, high negative space'
  }
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', sub: 'LinkedIn Feed Standard', dimensions: '1024×1024' },
  { id: '16:9', label: '16:9 Landscape', sub: 'Hero & Article Banner', dimensions: '1792×1024' }
];

const CAROUSEL_THEMES = [
  {
    id: 'modern_navy',
    name: 'Modern Navy',
    bg: '#0A1128',
    cardBg: '#132247',
    text: '#FFFFFF',
    accent: '#38BDF8',
    secondary: '#94A3B8'
  },
  {
    id: 'minimal_light',
    name: 'Minimal Light',
    bg: '#F8FAFC',
    cardBg: '#FFFFFF',
    text: '#0F172A',
    accent: '#2563EB',
    secondary: '#475569'
  },
  {
    id: 'executive_slate',
    name: 'Executive Slate',
    bg: '#0F172A',
    cardBg: '#1E293B',
    text: '#F8FAFC',
    accent: '#F59E0B',
    secondary: '#94A3B8'
  },
  {
    id: 'obsidian_purple',
    name: 'Obsidian Purple',
    bg: '#090514',
    cardBg: '#180E2E',
    text: '#FAF5FF',
    accent: '#C084FC',
    secondary: '#A855F7'
  },
  {
    id: 'emerald_growth',
    name: 'Emerald Growth',
    bg: '#022018',
    cardBg: '#064E3B',
    text: '#F0FDF4',
    accent: '#34D399',
    secondary: '#6EE7B7'
  },
  {
    id: 'sunset_ember',
    name: 'Sunset Ember',
    bg: '#181210',
    cardBg: '#2E1912',
    text: '#FFF7ED',
    accent: '#FB923C',
    secondary: '#FDBA74'
  }
];

function StudioWorkspaceContent() {
  const searchParams = useSearchParams();
  const preselectedArticleId = searchParams?.get('articleId');
  const draftIdParam = searchParams?.get('draftId');

  const { isAuthenticated, loading: authLoading, user } = useAuth();

  // News & Draft Selection States
  const [candidateArticles, setCandidateArticles] = useState([]);
  const [selectedArticleId, setSelectedArticleId] = useState(preselectedArticleId || '');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [recentDrafts, setRecentDrafts] = useState([]);

  // Active Draft & Version States
  const [currentDraft, setCurrentDraft] = useState(null);
  const [activeApproach, setActiveApproach] = useState('news_update'); // 'news_update' | 'industry_analysis' | 'professional_opinion'
  const [activeVersionType, setActiveVersionType] = useState('active'); // 'active' | 'initial' | 'humanized' | 'user_edited' | 'final_approved'

  // Humanization Parameters
  const [humanizationMode, setHumanizationMode] = useState('professional'); // 'light' | 'professional' | 'conversational'
  const [humanizing, setHumanizing] = useState(false);
  const [approving, setApproving] = useState(false);

  // Generation Input Parameters
  const [targetAudience, setTargetAudience] = useState('Senior software engineers and tech leaders');
  const [contentAngle, setContentAngle] = useState('');
  const [preferredStyle, setPreferredStyle] = useState('authoritative');
  const [isAngleModalOpen, setIsAngleModalOpen] = useState(false);
  const [newAngleInput, setNewAngleInput] = useState('');

  // Editable Post Fields (Active Draft)
  const [isEditing, setIsEditing] = useState(false);
  const [editHook, setEditHook] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCta, setEditCta] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // AI Image Generation & Media States
  const [draftMediaList, setDraftMediaList] = useState([]);
  const [selectedMediaAsset, setSelectedMediaAsset] = useState(null);
  const [selectedImageStyle, setSelectedImageStyle] = useState('tech_illustration');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1');
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVariation, setIsGeneratingVariation] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptPreviewData, setPromptPreviewData] = useState(null);

  // Carousel Studio States
  const [activeStudioTab, setActiveStudioTab] = useState('post'); // 'post' | 'carousel'
  const [currentCarousel, setCurrentCarousel] = useState(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [carouselSlideCount, setCarouselSlideCount] = useState(6);
  const [carouselTheme, setCarouselTheme] = useState('modern_navy');
  const [carouselAspectRatio, setCarouselAspectRatio] = useState('4:5');
  const [isGeneratingCarousel, setIsGeneratingCarousel] = useState(false);
  const [isRenderingCarousel, setIsRenderingCarousel] = useState(false);
  const [isRegeneratingSlide, setIsRegeneratingSlide] = useState(false);
  const [isSavingSlide, setIsSavingSlide] = useState(false);
  const [isSlideRegenModalOpen, setIsSlideRegenModalOpen] = useState(false);
  const [slideRegenInstructions, setSlideRegenInstructions] = useState('');

  // Slide Inline Editing States
  const [slideEditBadge, setSlideEditBadge] = useState('');
  const [slideEditHeading, setSlideEditHeading] = useState('');
  const [slideEditSubheading, setSlideEditSubheading] = useState('');
  const [slideEditBody, setSlideEditBody] = useState('');
  const [slideEditBullets, setSlideEditBullets] = useState([]);
  const [slideEditStatValue, setSlideEditStatValue] = useState('');
  const [slideEditStatLabel, setSlideEditStatLabel] = useState('');

  // UI Feedback States
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingHooks, setRegeneratingHooks] = useState(false);
  const [regeneratingPost, setRegeneratingPost] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // 1. Fetch Candidate Articles (selected / researched / shortlisted)
  const fetchArticles = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingArticles(true);
    try {
      const res = await newsApi.getAll({ limit: 40 });
      const items = res?.data?.items || [];
      const filtered = items.filter((a) => a.status !== 'rejected');
      setCandidateArticles(filtered);

      if (preselectedArticleId) {
        const found = filtered.find((a) => a._id === preselectedArticleId);
        if (found) {
          setSelectedArticle(found);
          setSelectedArticleId(found._id);
        } else {
          const singleRes = await newsApi.getById(preselectedArticleId);
          if (singleRes?.data) {
            setSelectedArticle(singleRes.data);
            setSelectedArticleId(singleRes.data._id);
          }
        }
      } else if (filtered.length > 0 && !selectedArticleId) {
        setSelectedArticle(filtered[0]);
        setSelectedArticleId(filtered[0]._id);
      }
    } catch (err) {
      console.warn('Failed to fetch candidate articles:', err.message);
    } finally {
      setLoadingArticles(false);
    }
  }, [isAuthenticated, preselectedArticleId]);

  // 2. Fetch Recent Drafts
  const fetchDrafts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await studioApi.getDrafts({ limit: 20 });
      const items = res?.data?.items || [];
      setRecentDrafts(items);

      if (draftIdParam) {
        const draftRes = await studioApi.getDraftById(draftIdParam);
        if (draftRes?.data) {
          loadDraftIntoStudio(draftRes.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch drafts:', err.message);
    }
  }, [isAuthenticated, draftIdParam]);

  useEffect(() => {
    fetchArticles();
    fetchDrafts();
  }, [fetchArticles, fetchDrafts]);

  // When selected article changes, update article state and pre-populate audience/angle
  const handleArticleSelect = (id) => {
    setSelectedArticleId(id);
    const found = candidateArticles.find((a) => a._id === id);
    if (found) {
      setSelectedArticle(found);
      if (found.topicId?.name) {
        setTargetAudience(`${found.topicId.name} decision makers and engineering leaders`);
      }
      if (found.deepResearch?.possibleAngles?.length > 0) {
        setContentAngle(found.deepResearch.possibleAngles[0]);
      }
    }
  };

  // Helper to sync current draft into UI state
  const loadDraftIntoStudio = (draft) => {
    setCurrentDraft(draft);
    setActiveApproach(draft.selectedApproach || 'news_update');
    setActiveVersionType('active');
    setEditTitle(draft.title || '');
    setEditHook(draft.hook || '');
    setEditBody(draft.body || '');
    setEditCta(draft.cta || '');
    setContentAngle(draft.contentAngle || '');
    setTargetAudience(draft.targetAudience || 'Industry professionals');
    setPreferredStyle(draft.preferredStyle || 'authoritative');
    setDraftMediaList([]);
    setSelectedMediaAsset(null);
    if (draft?._id) {
      fetchDraftMedia(draft._id);
      fetchDraftCarousel(draft._id);
    }
  };

  // Helper to sync slide into slide edit form
  const syncSlideToEditor = (slide) => {
    if (!slide) return;
    setSlideEditBadge(slide.categoryBadge || 'INSIGHT');
    setSlideEditHeading(slide.heading || '');
    setSlideEditSubheading(slide.subheading || '');
    setSlideEditBody(slide.bodyText || '');
    setSlideEditBullets(slide.bulletPoints || []);
    setSlideEditStatValue(slide.statCallout?.value || '');
    setSlideEditStatLabel(slide.statCallout?.label || '');
  };

  // Fetch carousel linked to draft
  const fetchDraftCarousel = async (draftId) => {
    try {
      const res = await carouselApi.getByDraft(draftId);
      if (res?.data && res.data.length > 0) {
        const carousel = res.data[0];
        setCurrentCarousel(carousel);
        setCarouselTheme(carousel.theme || 'modern_navy');
        setCarouselSlideCount(carousel.slideCount || 6);
        setCarouselAspectRatio(carousel.aspectRatio || '4:5');
        if (carousel.slides && carousel.slides.length > 0) {
          syncSlideToEditor(carousel.slides[0]);
          setActiveSlideIndex(0);
        }
      } else {
        setCurrentCarousel(null);
      }
    } catch (err) {
      console.warn('Could not load draft carousel:', err.message);
    }
  };

  // Carousel Handlers
  const handleGenerateCarousel = async (countOverride = null, themeOverride = null) => {
    if (!currentDraft) return;
    setIsGeneratingCarousel(true);
    setError('');
    try {
      const payload = {
        draftId: currentDraft._id,
        slideCount: countOverride || carouselSlideCount,
        theme: themeOverride || carouselTheme,
        aspectRatio: carouselAspectRatio
      };
      const res = await carouselApi.generate(payload);
      if (res?.data) {
        setCurrentCarousel(res.data);
        setActiveSlideIndex(0);
        syncSlideToEditor(res.data.slides?.[0]);
        showToast(`Generated ${res.data.slides?.length}-slide carousel with HTML/CSS architecture!`);
      }
    } catch (err) {
      setError(err.message || 'Carousel generation failed.');
    } finally {
      setIsGeneratingCarousel(false);
    }
  };

  const handleChangeTheme = async (newTheme) => {
    setCarouselTheme(newTheme);
    if (!currentCarousel) return;
    try {
      const res = await carouselApi.update(currentCarousel._id, { theme: newTheme });
      if (res?.data) {
        setCurrentCarousel(res.data);
        showToast(`Applied ${CAROUSEL_THEMES.find((t) => t.id === newTheme)?.name || newTheme} theme!`);
      }
    } catch (err) {
      setError(err.message || 'Could not change carousel theme.');
    }
  };

  const handleSelectSlide = (index) => {
    if (!currentCarousel?.slides || index < 0 || index >= currentCarousel.slides.length) return;
    setActiveSlideIndex(index);
    syncSlideToEditor(currentCarousel.slides[index]);
  };

  const handleSaveSlide = async () => {
    if (!currentCarousel) return;
    setIsSavingSlide(true);
    try {
      const payload = {
        heading: slideEditHeading,
        subheading: slideEditSubheading,
        bodyText: slideEditBody,
        bulletPoints: slideEditBullets,
        categoryBadge: slideEditBadge,
        statCallout: {
          value: slideEditStatValue,
          label: slideEditStatLabel
        }
      };
      const res = await carouselApi.updateSlide(currentCarousel._id, activeSlideIndex, payload);
      if (res?.data) {
        setCurrentCarousel(res.data);
        showToast(`Slide ${activeSlideIndex + 1} changes saved!`);
      }
    } catch (err) {
      setError(err.message || 'Failed to save slide.');
    } finally {
      setIsSavingSlide(false);
    }
  };

  const handleRegenerateSlide = async () => {
    if (!currentCarousel) return;
    setIsRegeneratingSlide(true);
    try {
      const res = await carouselApi.regenerateSlide(currentCarousel._id, activeSlideIndex, {
        instructions: slideRegenInstructions
      });
      if (res?.data?.carousel) {
        setCurrentCarousel(res.data.carousel);
        syncSlideToEditor(res.data.slide);
        setIsSlideRegenModalOpen(false);
        setSlideRegenInstructions('');
        showToast(`Regenerated Slide ${activeSlideIndex + 1} with AI!`);
      }
    } catch (err) {
      setError(err.message || 'Failed to regenerate slide.');
    } finally {
      setIsRegeneratingSlide(false);
    }
  };

  const handleRenderCarousel = async () => {
    if (!currentCarousel) return;
    setIsRenderingCarousel(true);
    try {
      const res = await carouselApi.render(currentCarousel._id);
      if (res?.data) {
        setCurrentCarousel(res.data);
        showToast('All carousel slides rendered to crisp PNGs and uploaded to Cloudinary!');
      }
    } catch (err) {
      setError(err.message || 'Slide rendering failed.');
    } finally {
      setIsRenderingCarousel(false);
    }
  };

  const handleDownloadSlidePng = (slideIndex) => {
    if (!currentCarousel) return;
    const slide = currentCarousel.slides?.[slideIndex];
    if (slide?.renderedImageUrl) {
      const link = document.createElement('a');
      link.href = slide.renderedImageUrl;
      link.target = '_blank';
      link.download = `slide-${String(slideIndex + 1).padStart(2, '0')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const url = carouselApi.getSlidePngUrl(currentCarousel._id, slideIndex);
      window.open(url, '_blank');
    }
  };

  const handleDownloadZip = () => {
    if (!currentCarousel) return;
    const url = carouselApi.getZipUrl(currentCarousel._id);
    window.open(url, '_blank');
    showToast('Exporting high-res carousel ZIP package...');
  };

  // Fetch media assets linked to current draft
  const fetchDraftMedia = async (draftId) => {
    try {
      const res = await mediaApi.getDraftMedia(draftId);
      if (res?.data) {
        const rawAssets = res.data.items || res.data.mediaAssets || [];
        const assets = Array.isArray(rawAssets) ? rawAssets.filter((m) => m && m._id) : [];
        setDraftMediaList(assets);
        const preferredId = res.data.selectedMediaAssetId || res.data.selectedMediaAsset;
        const preferred = assets.find(
          (m) => m?._id === preferredId || m?.isPreferred
        );
        setSelectedMediaAsset(preferred || assets[0] || null);
      }
    } catch (err) {
      console.warn('Could not load draft media assets:', err.message);
    }
  };

  // AI Media Handlers
  const handleGenerateImage = async (customPromptOverride = null) => {
    if (!currentDraft) return;
    setIsGeneratingImage(true);
    setError('');
    try {
      const activeConcept =
        currentVariation?.suggestedImageConcept ||
        currentDraft?.suggestedImageConcept ||
        '';

      const payload = {
        draftId: currentDraft._id,
        style: selectedImageStyle,
        imageStyle: selectedImageStyle,
        aspectRatio: selectedAspectRatio,
        concept: activeConcept || undefined,
        customPrompt: customPromptOverride || customImagePrompt.trim() || undefined
      };
      const res = await mediaApi.generateImage(payload);
      if (res?.data) {
        const newAsset = res.data.mediaAsset || res.data;
        if (newAsset && newAsset._id) {
          setDraftMediaList((prev) => {
            const valid = Array.isArray(prev) ? prev.filter((item) => item && item._id) : [];
            const filtered = valid.filter((item) => item._id !== newAsset._id);
            return [newAsset, ...filtered];
          });
          setSelectedMediaAsset(newAsset);
          showToast('Generated professional visual with DALL-E 3 & storage!');
        }
      }
    } catch (err) {
      setError(err.message || 'Image generation failed. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateVariation = async (style = null) => {
    if (!currentDraft) return;
    setIsGeneratingVariation(true);
    setError('');
    try {
      const chosenStyle = style || selectedImageStyle;
      const activeConcept =
        currentVariation?.suggestedImageConcept ||
        currentDraft?.suggestedImageConcept ||
        '';

      const payload = {
        style: chosenStyle,
        imageStyle: chosenStyle,
        aspectRatio: selectedAspectRatio,
        concept: activeConcept || undefined
      };
      const res = await mediaApi.generateVariation(currentDraft._id, payload);
      if (res?.data) {
        const newAsset = res.data.mediaAsset || res.data;
        if (newAsset && newAsset._id) {
          setDraftMediaList((prev) => {
            const valid = Array.isArray(prev) ? prev.filter((item) => item && item._id) : [];
            return [newAsset, ...valid];
          });
          setSelectedMediaAsset(newAsset);
          showToast('Created new visual variation!');
        }
      }
    } catch (err) {
      setError(err.message || 'Variation generation failed.');
    } finally {
      setIsGeneratingVariation(false);
    }
  };

  const handleSelectPreferredImage = async (assetId) => {
    if (!assetId) return;
    try {
      const res = await mediaApi.selectPreferred(assetId);
      if (res?.data) {
        const updatedAsset = res.data.mediaAsset || res.data;
        setDraftMediaList((prev) =>
          (Array.isArray(prev) ? prev.filter((item) => item && item._id) : []).map((item) => ({
            ...item,
            isPreferred: item._id === assetId
          }))
        );
        if (updatedAsset && updatedAsset._id) {
          setSelectedMediaAsset(updatedAsset);
        }
        showToast('Selected as primary LinkedIn post visual!');
      }
    } catch (err) {
      setError(err.message || 'Could not select preferred image.');
    }
  };

  const handleDeleteImage = async (assetId) => {
    if (!assetId) return;
    if (!confirm('Are you sure you want to delete this generated image?')) return;
    try {
      await mediaApi.delete(assetId);
      setDraftMediaList((prev) => {
        const valid = Array.isArray(prev) ? prev.filter((item) => item && item._id) : [];
        const updated = valid.filter((item) => item._id !== assetId);
        if (selectedMediaAsset?._id === assetId) {
          setSelectedMediaAsset(updated[0] || null);
        }
        return updated;
      });
      showToast('Image deleted from storage.');
    } catch (err) {
      setError(err.message || 'Failed to delete image.');
    }
  };

  const handlePreviewPrompt = async () => {
    if (!currentDraft) return;
    setIsGeneratingPrompt(true);
    setError('');
    try {
      const activeConcept =
        currentVariation?.suggestedImageConcept ||
        currentDraft?.suggestedImageConcept ||
        '';

      const res = await mediaApi.generatePrompt({
        draftId: currentDraft._id,
        style: selectedImageStyle,
        imageStyle: selectedImageStyle,
        aspectRatio: selectedAspectRatio,
        concept: activeConcept || undefined
      });
      if (res?.data) {
        setPromptPreviewData({
          ...res.data,
          imageStyle: selectedImageStyle,
          aspectRatio: selectedAspectRatio
        });
        setCustomImagePrompt(res.data.prompt);
        setIsPromptModalOpen(true);
      }
    } catch (err) {
      setError(err.message || 'Could not generate visual prompt preview.');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleDownloadImage = (url, style) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = `linkedin-visual-${style || 'post'}-${Date.now()}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Generate Posts Handler
  const handleGeneratePosts = async () => {
    if (!selectedArticleId) {
      setError('Please select a news article to generate posts.');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const res = await studioApi.generate({
        articleId: selectedArticleId,
        targetAudience,
        contentAngle,
        preferredStyle,
        postFormat: 'standard'
      });

      if (res?.data) {
        loadDraftIntoStudio(res.data);
        showToast('Generated 3 LinkedIn post variations successfully!');
        fetchDrafts();
      }
    } catch (err) {
      setError(err.message || 'Post generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // 4. Switch Active Approach (Variation)
  const handleSelectVariation = async (approach) => {
    if (!currentDraft) return;
    setActiveApproach(approach);

    try {
      const res = await studioApi.selectVariation(currentDraft._id, { approach });
      if (res?.data) {
        loadDraftIntoStudio(res.data);
        showToast(`Switched active approach to ${getApproachLabel(approach)}`);
      }
    } catch (err) {
      console.warn('Could not persist variation selection:', err.message);
    }
  };

  // 5. Select Specific Hook Option
  const handleSelectHook = async (hookText) => {
    if (!currentDraft) return;
    setEditHook(hookText);

    try {
      const res = await studioApi.selectVariation(currentDraft._id, {
        approach: activeApproach,
        selectedHook: hookText
      });
      if (res?.data) {
        loadDraftIntoStudio(res.data);
        showToast('Updated active hook option');
      }
    } catch (err) {
      console.warn('Could not persist hook selection:', err.message);
    }
  };

  // 6. Regenerate Hooks for Current Approach
  const handleRegenerateHooks = async () => {
    if (!currentDraft) return;
    setRegeneratingHooks(true);
    setError('');
    try {
      const res = await studioApi.regenerateHooks(currentDraft._id, {
        approach: activeApproach,
        contentAngle,
        targetAudience
      });
      if (res?.data?.draft) {
        loadDraftIntoStudio(res.data.draft);
        showToast('Generated 3 new hook options!');
      }
    } catch (err) {
      setError(err.message || 'Failed to regenerate hooks.');
    } finally {
      setRegeneratingHooks(false);
    }
  };

  // 7. Regenerate Single Post Approach
  const handleRegeneratePost = async () => {
    if (!currentDraft) return;
    setRegeneratingPost(true);
    setError('');
    try {
      const res = await studioApi.regeneratePost(currentDraft._id, {
        approach: activeApproach,
        contentAngle,
        targetAudience,
        preferredStyle
      });
      if (res?.data) {
        loadDraftIntoStudio(res.data);
        showToast(`Regenerated ${getApproachLabel(activeApproach)} post!`);
      }
    } catch (err) {
      setError(err.message || 'Failed to regenerate post.');
    } finally {
      setRegeneratingPost(false);
    }
  };

  // 8. Change Content Angle
  const handleChangeAngle = async () => {
    if (!currentDraft || !newAngleInput.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const res = await studioApi.changeAngle(currentDraft._id, {
        contentAngle: newAngleInput.trim()
      });
      if (res?.data) {
        loadDraftIntoStudio(res.data);
        setContentAngle(newAngleInput.trim());
        setIsAngleModalOpen(false);
        showToast('Updated angle and regenerated all 3 approaches!');
      }
    } catch (err) {
      setError(err.message || 'Failed to update content angle.');
    } finally {
      setGenerating(false);
    }
  };

  // 9. Humanize Post using Personal Writing Profile (Part B)
  const handleHumanizePost = async () => {
    if (!currentDraft) return;
    setHumanizing(true);
    setError('');
    try {
      const res = await studioApi.humanize(currentDraft._id, {
        mode: humanizationMode,
        contentAngle
      });
      if (res?.data?.draft) {
        loadDraftIntoStudio(res.data.draft);
        showToast(`Post humanized successfully (${humanizationMode} mode)!`);
        fetchDrafts();
      }
    } catch (err) {
      setError(err.message || 'Humanization failed.');
    } finally {
      setHumanizing(false);
    }
  };

  // 10. Approve Draft & Learn from Creator Edits (Part D)
  const handleApproveDraft = async () => {
    if (!currentDraft) return;
    setApproving(true);
    setError('');
    try {
      const res = await studioApi.approve(currentDraft._id);
      if (res?.data?.draft) {
        loadDraftIntoStudio(res.data.draft);
        const sugCount = res.data.newSuggestions?.length || 0;
        showToast(
          sugCount > 0
            ? `Post approved! Synthesized ${sugCount} new profile recommendation(s) for your review.`
            : 'Post approved and marked ready for publishing!'
        );
        fetchDrafts();
      }
    } catch (err) {
      setError(err.message || 'Failed to approve draft.');
    } finally {
      setApproving(false);
    }
  };

  // 11. Revert to a Previous Version
  const handleRevertVersion = async (versionType) => {
    if (!currentDraft) return;
    try {
      const res = await studioApi.revertVersion(currentDraft._id, { versionType });
      if (res?.data) {
        loadDraftIntoStudio(res.data);
        setActiveVersionType(versionType);
        showToast(`Reverted active post to ${versionType.replace('_', ' ')} version`);
      }
    } catch (err) {
      setError(err.message || 'Failed to revert version.');
    }
  };

  // 12. Save Manual Edits
  const handleSaveEdits = async (newStatus = null) => {
    if (!currentDraft) return;
    setSavingDraft(true);
    try {
      const payload = {
        title: editTitle,
        hook: editHook,
        body: editBody,
        cta: editCta
      };
      if (newStatus) {
        payload.status = newStatus;
      }
      const res = await studioApi.updateDraft(currentDraft._id, payload);
      if (res?.data) {
        loadDraftIntoStudio(res.data);
        setIsEditing(false);
        showToast('Draft changes saved successfully!');
        fetchDrafts();
      }
    } catch (err) {
      setError(err.message || 'Failed to save draft edits.');
    } finally {
      setSavingDraft(false);
    }
  };

  // 13. Copy Complete Post to Clipboard
  const handleCopyToClipboard = () => {
    if (!currentDraft) return;
    const activeVar =
      currentDraft.variations?.find((v) => v.approach === activeApproach) || {};

    const formattedPost = `${editHook || currentDraft.hook}

${editBody || currentDraft.body}

Key Takeaways:
${(activeVar.keyTakeaways || currentDraft.keyTakeaways || []).map((t) => `• ${t}`).join('\n')}

${editCta || currentDraft.cta || currentDraft.closingQuestion}

${(activeVar.hashtags || currentDraft.hashtags || []).join(' ')}

${activeVar.sourceAttribution || currentDraft.sourceAttribution || ''}`;

    navigator.clipboard.writeText(formattedPost);
    showToast('Copied full formatted LinkedIn post to clipboard!');
  };

  // Helper labels
  function getApproachLabel(approach) {
    switch (approach) {
      case 'news_update':
        return 'News Update';
      case 'industry_analysis':
        return 'Industry Analysis';
      case 'professional_opinion':
        return 'Professional Opinion';
      default:
        return 'Approach';
    }
  }

  const currentVariation =
    currentDraft?.variations?.find((v) => v.approach === activeApproach) ||
    currentDraft?.variations?.[0];

  const hookOptions = currentVariation?.hookOptions || [];
  const selectedHook = isEditing
    ? editHook
    : currentDraft?.hook || currentVariation?.selectedHook || hookOptions[0];

  return (
    <AppLayout
      title="Content Studio"
      subtitle="Craft, humanize, and preview viral LinkedIn thought leadership"
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-700 animate-fade-in">
          <span className="text-emerald-400">✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Input Configuration & Story Selector (4 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* Story Selection Box */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Select Verified Story
              </h2>
              <Link
                href="/discover"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                + Discover More
              </Link>
            </div>

            {loadingArticles ? (
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ) : candidateArticles.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
                <p className="font-bold">No candidate stories found</p>
                <p className="text-[11px] text-amber-700">
                  Discover news or approve stories from the News Discovery engine first.
                </p>
                <Link
                  href="/discover"
                  className="inline-block px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px]"
                >
                  Go to News Feed →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedArticleId}
                  onChange={(e) => handleArticleSelect(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {candidateArticles.map((art) => (
                    <option key={art._id} value={art._id}>
                      {art.title.length > 55 ? `${art.title.substring(0, 55)}...` : art.title} (
                      {art.publisher || 'Source'})
                    </option>
                  ))}
                </select>

                {/* Selected Article Meta Card */}
                {selectedArticle && (
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs space-y-2">
                    <p className="font-bold text-slate-900 leading-snug">{selectedArticle.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>{selectedArticle.publisher || 'Unknown'}</span>
                      <span>•</span>
                      <span>Score: {selectedArticle.relevanceScore || 75}/100</span>
                      {selectedArticle.deepResearch ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          🔬 Deep Researched
                        </span>
                      ) : (
                        <Link
                          href={`/discover/${selectedArticle._id}`}
                          className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold hover:underline"
                        >
                          Run Research →
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Strategy & Persona Configuration */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Generation Settings
            </h2>

            {/* Target Audience */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Target Audience</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Senior Software Engineers, Startup Founders"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Tech Founders', 'Engineering Leads', 'Product Managers', 'AI Researchers'].map(
                  (preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetAudience(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      {preset}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Content Angle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Content Angle</label>
              <input
                type="text"
                value={contentAngle}
                onChange={(e) => setContentAngle(e.target.value)}
                placeholder="e.g. Developer productivity gains, Strategic tradeoffs"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Direct Impact', 'Industry Ripple Effects', 'Critical Tradeoffs', 'Pragmatic Execution'].map(
                  (angle) => (
                    <button
                      key={angle}
                      type="button"
                      onClick={() => setContentAngle(angle)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      {angle}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Tone & Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tone & Style</label>
              <select
                value={preferredStyle}
                onChange={(e) => setPreferredStyle(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="authoritative">Authoritative & Strategic</option>
                <option value="conversational">Conversational & Accessible</option>
                <option value="analytical">Analytical & Metric-Driven</option>
                <option value="contrarian">Pragmatic & Contrarian</option>
                <option value="storytelling">Narrative Breakdown</option>
              </select>
            </div>

            {/* Generate Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGeneratePosts}
                disabled={generating || !selectedArticleId}
                className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  generating || !selectedArticleId
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Synthesizing 3 Distinct Approaches...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Generate 3 LinkedIn Post Approaches</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Humanization Control Box (Part B) */}
          {currentDraft && (
            <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 border border-indigo-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">👤</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                    AI Humanization Engine
                  </h2>
                </div>
                <Link
                  href="/profile"
                  className="text-[11px] font-bold text-indigo-700 hover:underline"
                >
                  Edit Profile →
                </Link>
              </div>

              <p className="text-xs text-indigo-900 leading-relaxed">
                Transform raw AI copy using your personal writing profile. Strips clichés, introduces dynamic
                sentence cadence, and preserves verified facts.
              </p>

              {/* Mode Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-indigo-900">Humanization Intensity</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'light', label: 'Light', desc: 'De-AI-ify only' },
                    { id: 'professional', label: 'Natural Prof', desc: 'Executive rhythm' },
                    { id: 'conversational', label: 'Conversational', desc: 'Dynamic cadence' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setHumanizationMode(m.id)}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        humanizationMode === m.id
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                          : 'bg-white/80 border-indigo-200 text-indigo-950 hover:bg-white text-xs'
                      }`}
                    >
                      <span className="block text-xs font-bold">{m.label}</span>
                      <span className="text-[9px] opacity-80 block truncate">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleHumanizePost}
                disabled={humanizing}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-400"
              >
                {humanizing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Humanizing with Your Voice...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Humanize Post with My Voice</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Recent Drafts Drawer */}
          {recentDrafts.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recent Generated Drafts
              </h2>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                {recentDrafts.map((d) => (
                  <button
                    key={d._id}
                    onClick={() => loadDraftIntoStudio(d)}
                    className={`w-full text-left py-2.5 px-2 rounded-lg transition-colors flex items-center justify-between text-xs cursor-pointer ${
                      currentDraft?._id === d._id
                        ? 'bg-blue-50/80 font-bold text-blue-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="truncate font-semibold">{d.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {getApproachLabel(d.selectedApproach)} • {d.status}{' '}
                        {d.isHumanized && <span className="text-purple-600 font-bold">• Humanized</span>}
                      </p>
                    </div>
                    <span className="text-slate-400 text-xs">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: 3-Approach Studio Preview & Editor (8 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-6">
          {!currentDraft ? (
            /* Empty State: Prompt User to Generate */
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Ready to Generate High-Signal LinkedIn Copy
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Choose a news article and target audience from the left panel, then click{' '}
                <span className="font-semibold text-slate-700">"Generate 3 LinkedIn Post Approaches"</span>.
              </p>
            </div>
          ) : (
            /* Active Post Studio Workspace */
            <div className="space-y-6">
              {/* Primary Content Studio Format Mode Switcher */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStudioTab('post')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeStudioTab === 'post'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>📝</span>
                    <span>Single Post & Visual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStudioTab('carousel');
                      if (!currentCarousel && currentDraft) {
                        handleGenerateCarousel();
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeStudioTab === 'carousel'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <span>📑</span>
                    <span>AI LinkedIn Carousel ({currentCarousel?.slides?.length || 6} Slides)</span>
                    {currentCarousel?.isRendered && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500 text-white font-bold">
                        PNGs Ready
                      </span>
                    )}
                  </button>
                </div>

                {activeStudioTab === 'carousel' && currentCarousel && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRenderCarousel}
                      disabled={isRenderingCarousel}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>{isRenderingCarousel ? '⏳' : '🎨'}</span>
                      <span>{isRenderingCarousel ? 'Rendering PNGs...' : 'Render High-Res PNGs'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadZip}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📦</span>
                      <span>Download All (ZIP)</span>
                    </button>
                  </div>
                )}
              </div>

              {activeStudioTab === 'post' ? (
                /* Post & Visual Graphic Workspace */
                <div className="space-y-6">
                  {/* Version History Selector Tabs (Part D) */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span>Draft History:</span>
                  <button
                    type="button"
                    onClick={() => handleRevertVersion('initial')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      activeVersionType === 'initial'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    1. Initial AI
                  </button>
                  {currentDraft.humanizedDraft?.body && (
                    <button
                      type="button"
                      onClick={() => handleRevertVersion('humanized')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        activeVersionType === 'humanized'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      2. Humanized ({currentDraft.humanizationMode || 'prof'})
                    </button>
                  )}
                  {currentDraft.userEditedDraft?.body && (
                    <button
                      type="button"
                      onClick={() => handleRevertVersion('user_edited')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        activeVersionType === 'user_edited'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                      }`}
                    >
                      3. User Edits
                    </button>
                  )}
                  {currentDraft.finalApprovedDraft?.body && (
                    <button
                      type="button"
                      onClick={() => handleRevertVersion('final_approved')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        activeVersionType === 'final_approved'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      4. Final Approved ✓
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    {currentDraft.versions?.length || 1} versions tracked
                  </span>
                </div>
              </div>

              {/* 3-Approach Selector Tabs */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-xs">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'news_update',
                      label: 'News Update',
                      desc: 'What happened & why it matters',
                      icon: '📰',
                      activeColor: 'border-blue-600 bg-blue-50/60 text-blue-900'
                    },
                    {
                      id: 'industry_analysis',
                      label: 'Industry Analysis',
                      desc: 'Macro trends & ripple effects',
                      icon: '📊',
                      activeColor: 'border-purple-600 bg-purple-50/60 text-purple-900'
                    },
                    {
                      id: 'professional_opinion',
                      label: 'Professional Opinion',
                      desc: 'Insightful discussion & tradeoffs',
                      icon: '💡',
                      activeColor: 'border-emerald-600 bg-emerald-50/60 text-emerald-900'
                    }
                  ].map((tab) => {
                    const isActive = activeApproach === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleSelectVariation(tab.id)}
                        className={`p-3 rounded-xl text-left border-2 transition-all cursor-pointer ${
                          isActive
                            ? tab.activeColor
                            : 'border-transparent hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{tab.icon}</span>
                          <span>{tab.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{tab.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hook Carousel / Selector */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Opening Hook Variations (Select One)
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                      {hookOptions.length} Options
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerateHooks}
                    disabled={regeneratingHooks}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{regeneratingHooks ? '⏳' : '🔄'}</span>
                    <span>{regeneratingHooks ? 'Regenerating...' : 'Regenerate Hooks'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {hookOptions.map((hookText, index) => {
                    const isSelected = selectedHook === hookText;
                    return (
                      <div
                        key={index}
                        onClick={() => handleSelectHook(hookText)}
                        className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 text-slate-900 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className={isSelected ? 'text-blue-700' : 'text-slate-400'}>
                              Option #{index + 1}
                            </span>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px]">
                                Active Hook
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium leading-relaxed">{hookText}</p>
                        </div>
                        <div className="pt-2 text-[10px] text-slate-400">
                          {hookText.length} characters
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quality Evaluation Card (Part C) */}
              {currentDraft.qualityEvaluation && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🎯</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Humanization Quality Evaluation
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Overall {currentDraft.qualityEvaluation.overallQualityScore}/100
                      </span>
                    </div>
                    {currentDraft.qualityEvaluation.genericFillerDetected?.length === 0 ? (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <span>✓</span>
                        <span>Zero Generic AI Filler</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-600">
                        {currentDraft.qualityEvaluation.genericFillerDetected.length} Cliche(s) Flagged
                      </span>
                    )}
                  </div>

                  {/* 6 Score Meters */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Naturalness</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentDraft.qualityEvaluation.naturalnessScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Profile Match</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentDraft.qualityEvaluation.profileConsistencyScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Clarity</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentDraft.qualityEvaluation.clarityScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Engagement</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentDraft.qualityEvaluation.engagementPotentialScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Relevance</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentDraft.qualityEvaluation.relevanceScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Factual Accuracy</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentDraft.qualityEvaluation.factualConsistencyScore}%
                      </span>
                    </div>
                  </div>

                  {currentDraft.qualityEvaluation.feedbackNotes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed italic">
                      &ldquo;{currentDraft.qualityEvaluation.feedbackNotes}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {/* LinkedIn Post Mockup & Editor */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                {/* Header bar */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">
                      {getApproachLabel(activeApproach)} Preview
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold uppercase">
                      {currentDraft.status || 'draft'}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({currentDraft.wordCount || 0} words • {currentDraft.characterCount || 0} chars)
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAngleModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      📐 Change Angle
                    </button>
                    <button
                      type="button"
                      onClick={handleRegeneratePost}
                      disabled={regeneratingPost}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      {regeneratingPost ? 'Regenerating Post...' : '🔄 Regenerate Post'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        isEditing
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isEditing ? 'Editing Mode' : '✏️ Edit Text'}
                    </button>
                  </div>
                </div>

                {/* LinkedIn Feed Card Mockup */}
                <div className="p-6 space-y-4">
                  {/* Mock Profile Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <span>{user?.name || 'Thought Leader'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">• 1st</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {user?.headline || 'Tech Strategist & Industry Operator'}
                      </p>
                      <p className="text-[10px] text-slate-400">Just now • 🌐</p>
                    </div>
                  </div>

                  {/* Post Content Area */}
                  {isEditing ? (
                    /* Inline Editing Mode */
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Opening Hook</label>
                        <textarea
                          rows={2}
                          value={editHook}
                          onChange={(e) => setEditHook(e.target.value)}
                          className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Post Body</label>
                        <textarea
                          rows={10}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="w-full text-xs font-normal leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Closing Question / CTA</label>
                        <input
                          type="text"
                          value={editCta}
                          onChange={(e) => setEditCta(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdits()}
                          disabled={savingDraft}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          {savingDraft ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-Only Formatted Post Preview */
                    <div className="space-y-4 pt-1">
                      {/* Hook */}
                      <p className="text-sm font-bold text-slate-900 leading-snug">
                        {selectedHook}
                      </p>

                      {/* Body */}
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line space-y-2">
                        {currentDraft.body || currentVariation?.content}
                      </div>

                      {/* Key Takeaways Box */}
                      {currentVariation?.keyTakeaways?.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                          <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                            Key Takeaways
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600">
                            {currentVariation.keyTakeaways.map((takeaway, i) => (
                              <li key={i}>{takeaway}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Closing Question */}
                      <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs font-semibold text-blue-950">
                        {currentDraft.cta || currentVariation?.closingQuestion}
                      </div>

                      {/* Hashtags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(currentVariation?.hashtags || currentDraft.hashtags || []).map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                          >
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>

                      {/* Source Attribution */}
                      <p className="text-[11px] text-slate-400 italic pt-1">
                        {currentVariation?.sourceAttribution || currentDraft.sourceAttribution}
                      </p>
                    </div>
                  )}

                  {/* Primary LinkedIn Attached Image */}
                  {selectedMediaAsset && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-950 group relative shadow-xs">
                      <div
                        className={`w-full relative overflow-hidden flex items-center justify-center bg-slate-950 ${
                          selectedMediaAsset.dimensions?.aspectRatio === '16:9'
                            ? 'aspect-video'
                            : 'aspect-square max-h-[460px]'
                        }`}
                      >
                        <img
                          src={selectedMediaAsset.secureUrl}
                          alt={selectedMediaAsset.altText || selectedMediaAsset.concept || 'LinkedIn Post Graphic'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                          loading="lazy"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-white border border-slate-700/60 flex items-center gap-1.5 shadow-xs">
                            <span>{IMAGE_STYLES.find((s) => s.id === selectedMediaAsset.imageStyle)?.icon || '🖼️'}</span>
                            <span>{IMAGE_STYLES.find((s) => s.id === selectedMediaAsset.imageStyle)?.name || selectedMediaAsset.imageStyle}</span>
                          </span>
                          <span className="px-2 py-1 rounded-md text-[9px] font-bold bg-slate-900/80 backdrop-blur-md text-slate-300 border border-slate-700/60 shadow-xs">
                            {selectedMediaAsset.dimensions?.width}×{selectedMediaAsset.dimensions?.height} • {selectedMediaAsset.generationModel?.toUpperCase() || 'DALL-E 3'}
                          </span>
                        </div>

                        {/* Top Right Quick Actions */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadImage(selectedMediaAsset.secureUrl, selectedMediaAsset.imageStyle)}
                            title="Download full-resolution image"
                            className="px-2.5 py-1 rounded-lg bg-slate-900/85 hover:bg-slate-900 text-white text-xs border border-slate-700/60 backdrop-blur-md shadow-md cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <span>⬇️</span>
                            <span>Download</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(selectedMediaAsset._id)}
                            title="Delete this image"
                            className="p-1.5 rounded-lg bg-red-900/85 hover:bg-red-900 text-red-200 text-xs border border-red-700/60 backdrop-blur-md shadow-md cursor-pointer transition-colors"
                          >
                            🗑️
                          </button>
                        </div>

                        {/* Bottom Concept Overlay */}
                        {selectedMediaAsset.concept && (
                          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent text-[11px] text-slate-200 line-clamp-1 pointer-events-none">
                            {selectedMediaAsset.concept}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Suggested Image Concept Box */}
                  {currentVariation?.suggestedImageConcept && (
                    <div className="mt-4 p-4 rounded-xl bg-purple-50/60 border border-purple-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900">
                        <span>🖼️</span>
                        <span>Suggested Visual Brief / Graphic Concept:</span>
                      </div>
                      <p className="text-purple-800 leading-relaxed">
                        {currentVariation.suggestedImageConcept}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Controls: Approve, Copy & Status Save */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-semibold">Workflow Status:</span>
                    {['draft', 'reviewing', 'ready'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleSaveEdits(st)}
                        className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase transition-colors cursor-pointer ${
                          currentDraft.status === st
                            ? 'bg-slate-900 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApproveDraft}
                      disabled={approving}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>✓</span>
                      <span>{approving ? 'Approving...' : 'Approve & Learn from Edits'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyToClipboard}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📋</span>
                      <span>Copy Formatted Post</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* AI IMAGE GENERATION STUDIO & VARIATIONS GALLERY           */}
              {/* ========================================================= */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🎨</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        AI Visual Studio (DALL-E 3 & Storage)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        {draftMediaList.filter((m) => m && m._id).length} Graphic{draftMediaList.filter((m) => m && m._id).length === 1 ? '' : 's'} Created
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Generate professional, text-free LinkedIn editorial graphics or 3D illustrations. Generating images preserves post text intact.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePreviewPrompt}
                      disabled={isGeneratingPrompt || isGeneratingImage}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>🔍</span>
                      <span>{isGeneratingPrompt ? 'Analyzing...' : 'Preview / Edit Prompt'}</span>
                    </button>
                    {draftMediaList.filter((m) => m && m._id).length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleGenerateVariation()}
                        disabled={isGeneratingVariation || isGeneratingImage}
                        className="px-3.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/70 text-purple-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <span>✨</span>
                        <span>{isGeneratingVariation ? 'Generating...' : '+ Add Another Variation'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 1. Style Selection Cards */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Visual Aesthetic Style
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {IMAGE_STYLES.map((style) => {
                      const isSelected = selectedImageStyle === style.id;
                      return (
                        <div
                          key={style.id}
                          onClick={() => setSelectedImageStyle(style.id)}
                          className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50/40 text-slate-900 shadow-xs ring-2 ring-purple-600/10'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 font-bold">
                                <span>{style.icon}</span>
                                <span>{style.name}</span>
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {style.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{style.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Aspect Ratio & Generation Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700">Aspect Ratio:</span>
                    <div className="flex items-center gap-1.5">
                      {ASPECT_RATIOS.map((ratio) => (
                        <button
                          key={ratio.id}
                          type="button"
                          onClick={() => setSelectedAspectRatio(ratio.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selectedAspectRatio === ratio.id
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {ratio.label} ({ratio.dimensions})
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateImage()}
                    disabled={isGeneratingImage || isGeneratingVariation}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isGeneratingImage ? '⏳' : '🎨'}</span>
                    <span>
                      {isGeneratingImage
                        ? 'Synthesizing with DALL-E 3 & Cloudinary...'
                        : 'Generate AI Post Graphic'}
                    </span>
                  </button>
                </div>

                {/* 3. Generated Variations Gallery */}
                {draftMediaList?.filter((m) => m && m._id).length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Generated Image Variations ({draftMediaList.filter((m) => m && m._id).length})
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Click any variation to inspect or set as preferred LinkedIn visual
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {draftMediaList.filter((m) => m && m._id).map((media) => {
                        const isPreferred = selectedMediaAsset?._id === media?._id;
                        const styleMeta = IMAGE_STYLES.find((s) => s.id === media?.imageStyle);
                        return (
                          <div
                            key={media._id}
                            className={`rounded-xl border-2 overflow-hidden transition-all bg-white flex flex-col justify-between ${
                              isPreferred
                                ? 'border-purple-600 ring-2 ring-purple-500/20 shadow-md'
                                : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                            }`}
                          >
                            {/* Thumbnail */}
                            <div
                              onClick={() => handleSelectPreferredImage(media._id)}
                              className="w-full aspect-video bg-slate-900 relative overflow-hidden cursor-pointer group"
                            >
                              <img
                                src={media.secureUrl}
                                alt={media.concept || 'Post variation'}
                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                loading="lazy"
                              />
                              {isPreferred && (
                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                                  <span>✓</span>
                                  <span>Primary Post Visual</span>
                                </div>
                              )}
                              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[9px] font-mono">
                                {media.dimensions?.aspectRatio || '1:1'}
                              </div>
                            </div>

                            {/* Meta & Actions */}
                            <div className="p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-800 flex items-center gap-1">
                                  <span>{styleMeta?.icon || '🖼️'}</span>
                                  <span>{styleMeta?.name || media.imageStyle}</span>
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {media.dimensions?.width}×{media.dimensions?.height}
                                </span>
                              </div>

                              {media.concept && (
                                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                  {media.concept}
                                </p>
                              )}

                              <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                                {!isPreferred ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectPreferredImage(media._id)}
                                    className="text-[11px] font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
                                  >
                                    Set as Primary
                                  </button>
                                ) : (
                                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                                    <span>✓</span>
                                    <span>Selected</span>
                                  </span>
                                )}

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadImage(media.secureUrl, media.imageStyle)}
                                    title="Download image"
                                    className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs cursor-pointer"
                                  >
                                    ⬇️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteImage(media._id)}
                                    title="Delete image"
                                    className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 text-xs cursor-pointer"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Carousel Studio Workspace */
            <div className="space-y-6">
              {/* Carousel Top Controls Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📑</span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {currentCarousel?.title || 'AI LinkedIn Carousel Studio'}
                      </h3>
                      {currentCarousel?.isRendered ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ✓ High-Res PNGs Rendered (Cloudinary)
                        </span>
                      ) : currentCarousel ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          HTML/CSS Preview Ready
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500">
                      Rendered using modular HTML/CSS templates for crisp typography, zero AI text artifacts, and mobile readability.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!currentCarousel ? (
                      <button
                        type="button"
                        onClick={() => handleGenerateCarousel()}
                        disabled={isGeneratingCarousel}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        <span>{isGeneratingCarousel ? '⏳' : '⚡'}</span>
                        <span>{isGeneratingCarousel ? 'Synthesizing Slides...' : 'Generate 6-Slide Carousel'}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleGenerateCarousel()}
                          disabled={isGeneratingCarousel}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                        >
                          {isGeneratingCarousel ? 'Regenerating...' : '🔄 Regenerate All Slides'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRenderCarousel}
                          disabled={isRenderingCarousel}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <span>{isRenderingCarousel ? '⏳' : '🎨'}</span>
                          <span>{isRenderingCarousel ? 'Rendering PNGs...' : 'Render High-Res PNGs'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadZip}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <span>📦</span>
                          <span>Download ZIP</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {currentCarousel && (
                  <div className="space-y-4">
                    {/* Theme Selector Swatches */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Brand Editorial Theme
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {CAROUSEL_THEMES.map((th) => {
                          const isSelected = (currentCarousel?.theme || carouselTheme) === th.id;
                          return (
                            <button
                              key={th.id}
                              type="button"
                              onClick={() => handleChangeTheme(th.id)}
                              className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                                isSelected
                                  ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                                  style={{ backgroundColor: th.bg }}
                                />
                                <span
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: th.accent }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-800 truncate block">
                                {th.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Slide Count & Aspect Ratio */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Slide Count:</span>
                        {[5, 6, 7].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleGenerateCarousel(num)}
                            disabled={isGeneratingCarousel}
                            className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                              (currentCarousel?.slideCount || carouselSlideCount) === num
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {num} Slides
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Format:</span>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                          4:5 Portrait (1080×1350)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!currentCarousel ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl">
                    📑
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    No Carousel Created for this Post Yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Click "Generate 6-Slide Carousel" above to distill this approved post and research document into a high-engagement 5-7 slide visual deck.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleGenerateCarousel()}
                    disabled={isGeneratingCarousel}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>{isGeneratingCarousel ? '⏳' : '⚡'}</span>
                    <span>Generate Carousel Now</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Main Interactive Slide Canvas & Inspector */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT: Live Interactive Slide Viewport (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Slide Navigation Header */}
                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleSelectSlide(Math.max(0, activeSlideIndex - 1))}
                          disabled={activeSlideIndex === 0}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                        >
                          ← Prev Slide
                        </button>

                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                          <span>Slide</span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                            {activeSlideIndex + 1} / {currentCarousel.slides?.length || 6}
                          </span>
                          <span className="text-slate-400 font-normal">
                            ({currentCarousel.slides?.[activeSlideIndex]?.slideType?.replace('_', ' ') || 'content'})
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleSelectSlide(
                              Math.min((currentCarousel.slides?.length || 6) - 1, activeSlideIndex + 1)
                            )
                          }
                          disabled={activeSlideIndex === (currentCarousel.slides?.length || 6) - 1}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                        >
                          Next Slide →
                        </button>
                      </div>

                      {/* Live Interactive Slide Canvas Container (Scaled 4:5 preview) */}
                      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md relative bg-slate-950">
                        {(() => {
                          const slide = currentCarousel.slides?.[activeSlideIndex];
                          const activeTheme =
                            CAROUSEL_THEMES.find((t) => t.id === currentCarousel.theme) ||
                            CAROUSEL_THEMES[0];
                          const total = currentCarousel.slides?.length || 6;
                          const pct = Math.round(((activeSlideIndex + 1) / total) * 100);

                          if (!slide) return null;

                          return (
                            <div
                              className="w-full aspect-[4/5] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden select-none transition-colors duration-200"
                              style={{ backgroundColor: activeTheme.bg, color: activeTheme.text }}
                            >
                              {/* Top Progress Line */}
                              <div className="absolute top-0 inset-x-0 h-1.5 bg-white/10">
                                <div
                                  className="h-full transition-all duration-300"
                                  style={{ width: `${pct}%`, backgroundColor: activeTheme.accent }}
                                />
                              </div>

                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div
                                  className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-extrabold tracking-wider uppercase border flex items-center gap-1.5"
                                  style={{
                                    backgroundColor: activeTheme.cardBg,
                                    borderColor: `${activeTheme.accent}40`,
                                    color: activeTheme.accent
                                  }}
                                >
                                  <span>⚡</span>
                                  <span>{slide.categoryBadge || 'INSIGHT'}</span>
                                </div>
                                <div
                                  className="text-xs sm:text-sm font-bold tracking-wider"
                                  style={{ color: activeTheme.secondary }}
                                >
                                  {String(activeSlideIndex + 1).padStart(2, '0')} /{' '}
                                  {String(total).padStart(2, '0')}
                                </div>
                              </div>

                              {/* Body */}
                              <div className="flex-1 flex flex-col justify-center gap-4 my-4">
                                {slide.slideType === 'hook_intro' ? (
                                  <>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
                                      {slide.heading}
                                    </h2>
                                    {slide.subheading && (
                                      <p
                                        className="text-sm sm:text-base font-semibold leading-snug"
                                        style={{ color: activeTheme.accent }}
                                      >
                                        {slide.subheading}
                                      </p>
                                    )}
                                    <div
                                      className="p-4 rounded-xl border shadow-xs space-y-2"
                                      style={{
                                        backgroundColor: activeTheme.cardBg,
                                        borderColor: `${activeTheme.accent}30`
                                      }}
                                    >
                                      <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                                        {slide.bodyText}
                                      </p>
                                      <div
                                        className="flex items-center gap-1 text-xs font-bold pt-1"
                                        style={{ color: activeTheme.accent }}
                                      >
                                        <span>👉</span>
                                        <span>Swipe for the full strategic breakdown</span>
                                      </div>
                                    </div>
                                  </>
                                ) : slide.slideType === 'closing_cta' ? (
                                  <div className="text-center space-y-4">
                                    <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                                      {slide.heading}
                                    </h2>
                                    <div
                                      className="p-5 rounded-xl border space-y-3"
                                      style={{
                                        backgroundColor: activeTheme.cardBg,
                                        borderColor: `${activeTheme.accent}30`
                                      }}
                                    >
                                      <p
                                        className="text-sm font-bold"
                                        style={{ color: activeTheme.accent }}
                                      >
                                        {slide.subheading || 'What is your perspective on this?'}
                                      </p>
                                      <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                                        {slide.bodyText}
                                      </p>
                                      <div
                                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold"
                                        style={{
                                          backgroundColor: activeTheme.accent,
                                          color: activeTheme.bg
                                        }}
                                      >
                                        <span>💬 Join the Discussion</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="space-y-1">
                                      <span
                                        className="text-[10px] font-bold tracking-widest uppercase block"
                                        style={{ color: activeTheme.secondary }}
                                      >
                                        {slide.slideType === 'key_takeaway'
                                          ? 'KEY TAKEAWAY'
                                          : `POINT #${activeSlideIndex}`}
                                      </span>
                                      <h2 className="text-xl sm:text-2xl font-extrabold leading-snug">
                                        {slide.heading}
                                      </h2>
                                    </div>

                                    {slide.subheading && (
                                      <p
                                        className="text-xs sm:text-sm font-semibold"
                                        style={{ color: activeTheme.accent }}
                                      >
                                        {slide.subheading}
                                      </p>
                                    )}

                                    {slide.statCallout?.value && (
                                      <div
                                        className="flex items-baseline gap-3 p-3 rounded-r-xl border-l-4"
                                        style={{
                                          backgroundColor: `${activeTheme.accent}15`,
                                          borderLeftColor: activeTheme.accent
                                        }}
                                      >
                                        <span
                                          className="text-2xl sm:text-3xl font-black"
                                          style={{ color: activeTheme.accent }}
                                        >
                                          {slide.statCallout.value}
                                        </span>
                                        <span
                                          className="text-xs font-bold"
                                          style={{ color: activeTheme.secondary }}
                                        >
                                          {slide.statCallout.label}
                                        </span>
                                      </div>
                                    )}

                                    {slide.bodyText && (
                                      <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                                        {slide.bodyText}
                                      </p>
                                    )}

                                    {slide.bulletPoints?.length > 0 && (
                                      <div
                                        className="p-3.5 rounded-xl border space-y-1.5"
                                        style={{
                                          backgroundColor: activeTheme.cardBg,
                                          borderColor: `${activeTheme.accent}30`
                                        }}
                                      >
                                        {slide.bulletPoints.map((bp, bidx) => (
                                          <div key={bidx} className="flex items-start gap-2 text-xs">
                                            <span
                                              className="w-4 h-4 rounded flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5"
                                              style={{
                                                backgroundColor: `${activeTheme.accent}25`,
                                                color: activeTheme.accent
                                              }}
                                            >
                                              ✓
                                            </span>
                                            <span>{bp}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Footer */}
                              <div
                                className="flex items-center justify-between pt-3 border-t"
                                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                                    style={{
                                      backgroundColor: activeTheme.accent,
                                      color: activeTheme.bg
                                    }}
                                  >
                                    {user?.name?.charAt(0) || 'U'}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold leading-tight">
                                      {user?.name || 'Thought Leader'}
                                    </p>
                                    <p
                                      className="text-[10px] leading-tight"
                                      style={{ color: activeTheme.secondary }}
                                    >
                                      {user?.headline || 'Tech Strategist'}
                                    </p>
                                  </div>
                                </div>

                                <div
                                  className="text-xs font-extrabold tracking-wider uppercase flex items-center gap-1"
                                  style={{ color: activeTheme.accent }}
                                >
                                  {slide.slideType === 'closing_cta' ? 'SAVE & SHARE 🔖' : 'SWIPE ➔'}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Quick Actions Below Canvas */}
                      <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleDownloadSlidePng(activeSlideIndex)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>⬇️</span>
                          <span>Download Slide {activeSlideIndex + 1} PNG</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsSlideRegenModalOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold cursor-pointer flex items-center gap-1.5 border border-blue-200"
                        >
                          <span>✨</span>
                          <span>Regenerate Slide {activeSlideIndex + 1} with AI</span>
                        </button>
                      </div>

                      {/* Slide Track Thumbnails */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {currentCarousel.slides?.map((sl, idx) => (
                          <button
                            key={sl._id || idx}
                            type="button"
                            onClick={() => handleSelectSlide(idx)}
                            className={`px-3 py-2 rounded-xl text-left border transition-all cursor-pointer shrink-0 ${
                              activeSlideIndex === idx
                                ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold ring-2 ring-blue-600/20'
                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            <div className="text-[10px] opacity-70 uppercase tracking-wider">
                              #{idx + 1} {sl.slideType?.replace('_', ' ')}
                            </div>
                            <div className="text-xs font-bold truncate max-w-[120px]">
                              {sl.heading}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* RIGHT: Slide Content Form Editor (5 cols) */}
                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Edit Slide #{activeSlideIndex + 1} Content
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold uppercase">
                          {currentCarousel.slides?.[activeSlideIndex]?.slideType || 'content_point'}
                        </span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Category Badge</label>
                          <input
                            type="text"
                            value={slideEditBadge}
                            onChange={(e) => setSlideEditBadge(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Heading</label>
                          <input
                            type="text"
                            value={slideEditHeading}
                            onChange={(e) => setSlideEditHeading(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Subheading</label>
                          <input
                            type="text"
                            value={slideEditSubheading}
                            onChange={(e) => setSlideEditSubheading(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Body Text</label>
                          <textarea
                            rows={4}
                            value={slideEditBody}
                            onChange={(e) => setSlideEditBody(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs leading-relaxed"
                          />
                        </div>

                        {/* Stat Callout (value & label) */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Stat Value</label>
                            <input
                              type="text"
                              placeholder="e.g. 4.5x or 68%"
                              value={slideEditStatValue}
                              onChange={(e) => setSlideEditStatValue(e.target.value)}
                              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Stat Label</label>
                            <input
                              type="text"
                              placeholder="e.g. Lower token cost"
                              value={slideEditStatLabel}
                              onChange={(e) => setSlideEditStatLabel(e.target.value)}
                              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                            />
                          </div>
                        </div>

                        {/* Takeaway Bullets */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700 block">Takeaway Bullets</label>
                          {slideEditBullets.map((bullet, bidx) => (
                            <div key={bidx} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={bullet}
                                onChange={(e) => {
                                  const copy = [...slideEditBullets];
                                  copy[bidx] = e.target.value;
                                  setSlideEditBullets(copy);
                                }}
                                className="flex-1 p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setSlideEditBullets(slideEditBullets.filter((_, i) => i !== bidx))
                                }
                                className="p-1 text-red-500 hover:text-red-700 text-xs cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setSlideEditBullets([...slideEditBullets, 'New key takeaway bullet'])}
                            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            + Add Bullet Point
                          </button>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleSaveSlide}
                            disabled={isSavingSlide}
                            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            {isSavingSlide ? 'Saving Slide...' : 'Save Slide Changes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  </div>

      {/* Change Angle Modal */}
      {isAngleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Change Content Angle</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Updating the content angle will re-synthesize all 3 post variations (News Update, Industry Analysis, and Professional Opinion) through this specific lens.
            </p>
            <input
              type="text"
              value={newAngleInput}
              onChange={(e) => setNewAngleInput(e.target.value)}
              placeholder="e.g. Enterprise AI Governance and Developer Velocity"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAngleModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangeAngle}
                disabled={generating || !newAngleInput.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {generating ? 'Re-synthesizing...' : 'Apply & Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Prompt Preview & Direct Generator Modal */}
      {isPromptModalOpen && promptPreviewData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🎨</span>
                <h3 className="text-sm font-bold text-slate-900">
                  DALL-E 3 Visual Prompt & Concept Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Synthesized Concept */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Synthesized Graphic Concept
              </label>
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 leading-relaxed font-medium">
                {promptPreviewData.concept}
              </div>
            </div>

            {/* Strict Quality Guarantee Notice */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Anti-Artifact & Text-Free Directives Enforced</span>
              </div>
              <p>
                Prompt automatically prohibits text, letters, fake logos, garbled typography, and watermarks to ensure maximum LinkedIn visual professionalism.
              </p>
            </div>

            {/* Editable Prompt */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Full DALL-E 3 Image Prompt</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({customImagePrompt.length} chars)
                </span>
              </label>
              <textarea
                rows={5}
                value={customImagePrompt}
                onChange={(e) => setCustomImagePrompt(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-slate-400">
                Style: <span className="font-bold text-slate-700">{promptPreviewData.imageStyle}</span> • Ratio: <span className="font-bold text-slate-700">{promptPreviewData.aspectRatio}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPromptModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPromptModalOpen(false);
                    handleGenerateImage(customImagePrompt);
                  }}
                  disabled={isGeneratingImage || !customImagePrompt.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>🚀</span>
                  <span>Generate Graphic Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Slide Regeneration Modal */}
      {isSlideRegenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Regenerate Slide #{activeSlideIndex + 1} with AI
              </h3>
              <button
                type="button"
                onClick={() => setIsSlideRegenModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Give optional custom instructions to steer the AI synthesis of this specific slide.
            </p>
            <textarea
              rows={3}
              value={slideRegenInstructions}
              onChange={(e) => setSlideRegenInstructions(e.target.value)}
              placeholder="e.g. Focus on operational cost savings and sharpen the takeaway bullets..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSlideRegenModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateSlide}
                disabled={isRegeneratingSlide}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>{isRegeneratingSlide ? '⏳' : '✨'}</span>
                <span>{isRegeneratingSlide ? 'Regenerating...' : 'Regenerate Slide'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function ContentStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StudioWorkspaceContent />
    </Suspense>
  );
}
