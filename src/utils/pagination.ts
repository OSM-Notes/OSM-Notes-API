/**
 * Pagination utilities
 * Helper functions for generating pagination headers
 */

import { Response } from 'express';
import { Pagination } from '../types';

/**
 * Generate pagination headers for HTTP responses
 * Follows RFC 5988 Link header standard and common pagination headers
 *
 * @param res Express response object
 * @param pagination Pagination metadata
 * @param baseUrl Base URL for generating pagination links (e.g., '/api/v1/notes')
 * @param queryParams Query parameters to preserve in links (excluding page)
 */
export function setPaginationHeaders(
  res: Response,
  pagination: Pagination,
  baseUrl: string,
  queryParams: Record<string, string | number | undefined> = {}
): void {
  const { page, limit, total, total_pages } = pagination;

  // Standard pagination headers
  res.setHeader('X-Total-Count', total.toString());
  res.setHeader('X-Page', page.toString());
  res.setHeader('X-Per-Page', limit.toString());
  res.setHeader('X-Total-Pages', total_pages.toString());

  // Build query string from params (excluding page)
  const buildQueryString = (pageNum: number): string => {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'page') {
        params.append(key, String(value));
      }
    });
    params.append('page', pageNum.toString());
    if (limit !== 20) {
      // Only include limit if it's not the default
      params.append('limit', limit.toString());
    }
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  // Generate Link header (RFC 5988)
  const links: string[] = [];

  // First page
  if (page > 1) {
    links.push(`<${baseUrl}${buildQueryString(1)}>; rel="first"`);
  }

  // Previous page
  if (page > 1) {
    links.push(`<${baseUrl}${buildQueryString(page - 1)}>; rel="prev"`);
  }

  // Next page
  if (page < total_pages) {
    links.push(`<${baseUrl}${buildQueryString(page + 1)}>; rel="next"`);
  }

  // Last page
  if (page < total_pages && total_pages > 1) {
    links.push(`<${baseUrl}${buildQueryString(total_pages)}>; rel="last"`);
  }

  // Set Link header if there are any links
  if (links.length > 0) {
    res.setHeader('Link', links.join(', '));
  }
}
