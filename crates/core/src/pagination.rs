//! Splitting long lists into pages.

/// Requests the page with the zero-based `index` of a list split into pages of `size` items.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PageRequest {
    index: u64,
    size: usize,
}

impl PageRequest {
    /// Creates a request for the page `index` (zero based) with `size` items per page.
    ///
    /// # Panics
    ///
    /// Panics if `size` is `0`.
    #[must_use]
    pub fn new(index: u64, size: usize) -> Self {
        assert!(size > 0, "the page size must be positive");
        Self { index, size }
    }

    /// Returns the zero-based page index.
    #[must_use]
    pub const fn index(&self) -> u64 {
        self.index
    }

    /// Returns the number of items per page.
    #[must_use]
    pub const fn size(&self) -> usize {
        self.size
    }

    /// Returns the number of items preceding the page.
    #[must_use]
    pub const fn offset(&self) -> u64 {
        self.index.saturating_mul(self.size as u64)
    }

    /// Returns the number of pages needed for `total_items` items (at least one).
    #[must_use]
    pub const fn page_count(&self, total_items: u64) -> u64 {
        let pages = total_items.div_ceil(self.size as u64);
        if pages == 0 { 1 } else { pages }
    }

    /// Returns the request moved to the last page if it lies beyond it.
    #[must_use]
    pub fn clamped(self, total_items: u64) -> Self {
        Self {
            index: self.index.min(self.page_count(total_items) - 1),
            ..self
        }
    }
}

/// One page of a list.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Page<T> {
    items: Vec<T>,
    request: PageRequest,
    total_items: u64,
}

impl<T> Page<T> {
    /// Creates a page holding `items` of a list with `total_items` items.
    #[must_use]
    pub const fn new(items: Vec<T>, request: PageRequest, total_items: u64) -> Self {
        Self {
            items,
            request,
            total_items,
        }
    }

    /// Returns the items of the page.
    #[must_use]
    pub fn items(&self) -> &[T] {
        &self.items
    }

    /// Consumes the page and returns its items.
    #[must_use]
    pub fn into_items(self) -> Vec<T> {
        self.items
    }

    /// Returns the zero-based index of the page.
    #[must_use]
    pub const fn index(&self) -> u64 {
        self.request.index()
    }

    /// Returns the maximum number of items per page.
    #[must_use]
    pub const fn size(&self) -> usize {
        self.request.size()
    }

    /// Returns the number of items preceding this page.
    #[must_use]
    pub const fn offset(&self) -> u64 {
        self.request.offset()
    }

    /// Returns the number of items in the whole list.
    #[must_use]
    pub const fn total_items(&self) -> u64 {
        self.total_items
    }

    /// Returns the number of pages of the whole list (at least one).
    #[must_use]
    pub const fn page_count(&self) -> u64 {
        self.request.page_count(self.total_items)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn computes_offsets_and_counts() {
        let request = PageRequest::new(2, 10);
        assert_eq!(request.offset(), 20);
        assert_eq!(request.page_count(0), 1);
        assert_eq!(request.page_count(21), 3);
        assert_eq!(request.clamped(15).index(), 1);
        assert_eq!(request.clamped(100).index(), 2);
    }
}
