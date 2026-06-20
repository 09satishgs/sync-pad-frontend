import { useState } from 'react';

export const useSidebar = ({ onCreateCategory }) => {
  const [newCatName, setNewCatName] = useState('');
  const [showCatInput, setShowCatInput] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});

  const toggleCategory = (catId) => {
    setExpandedCats((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleCreateCategorySubmit = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onCreateCategory(newCatName.trim());
    setNewCatName('');
    setShowCatInput(false);
  };

  return {
    newCatName,
    setNewCatName,
    showCatInput,
    setShowCatInput,
    expandedCats,
    toggleCategory,
    handleCreateCategorySubmit,
  };
};
