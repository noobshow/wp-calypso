/** @format */

/**
 * External dependencies
 */

import { get } from 'lodash';

export function isRequestingWordadsEarnings( state, siteId ) {
	return !! state.wordads.earnings.fetchingItems[ siteId ];
}

/**
 * Returns true if the WordAds earnings for a siteId @TODO fix
 * @param   {Object} state  Global State
 * @param   {Number} siteId Site Id
 * @returns {Object}        WordAds Error
 */
export function getWordAdsEarnings( state, siteId ) {
	return state.wordads.earnings.items[ siteId ];
}

/**
 * Sanitizes site object and returns true if the WordAds approval request was successful @TODO fix
 * @param   {Object} state  Global State
 * @param   {Object} site   Site
 * @returns {Object}        WordAds Error
 */
export function getWordAdsEarningsForSite( state, site ) {
	if ( ! site || ! site.ID ) {
		return null;
	}
	return getWordAdsEarnings( state, site.ID );
}
