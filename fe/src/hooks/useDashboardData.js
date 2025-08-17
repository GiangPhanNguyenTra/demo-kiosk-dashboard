import { useState, useEffect } from 'react';
import axios from 'axios';
import { message } from 'antd';
import dayjs from 'dayjs';

export const useDashboardData = (wardId) => {
	const [reports, setReports] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Tính toán reportStats từ reports
	const reportStats = {
		total: reports.filter(r => r.ward_id === wardId).length,
		totalCount: reports
			.filter(r => r.ward_id === wardId)
			.reduce((sum, report) => sum + (report.count || 0), 0),
		byProcedure: reports
			.filter(r => r.ward_id === wardId)
			.reduce((acc, report) => {
				acc[report.procedure] = (acc[report.procedure] || 0) + (report.count || 1);
				return acc;
			}, {}),
		byGender: reports
			.filter(r => r.ward_id === wardId)
			.reduce((acc, report) => {
				acc[report.gender] = (acc[report.gender] || 0) + (report.count || 1);
				return acc;
			}, {}),
	};

	const transformData = (reports) => {
		if (!Array.isArray(reports)) return [];

		// Log raw data to verify hour values
		// console.log('Raw reports sample:', reports.slice(0, 5));

		return reports.map(report => {
			const hour = report.hour || report.print_time;
			// console.log('Processing hour:', hour, 'for report:', report);

			return {
				...report,
				hour: parseInt(hour), // Ensure hour is a number
				count: report.count || 1,
				wardId: report.ward_id
			};
		}).filter(item => {
			const validHour = item.hour >= 7 && item.hour <= 17;
			if (!validHour) {
				console.warn('Invalid hour:', item.hour, 'for report:', item);
			}
			return validHour;
		});
	};

	const fetchData = async () => {
		setLoading(true);
		try {
			const response = await axios.get('/reports', {
				params: { limit: 10000, offset: 0 } // Tăng limit để lấy đủ dữ liệu
			});

			if (!response.data.success) {
				throw new Error(response.data.message || 'Không thể tải dữ liệu');
			}

			const rawData = response.data.data || [];
			// console.log('Raw data sample:', rawData.slice(0, 5));

			setReports(rawData);
			return rawData;

		} catch (error) {
			// console.error('Error fetching data:', error);
			message.error(`Lỗi: ${error.message}`);
			setError(error.message);
			return [];
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (wardId) {
			fetchData();
		}
	}, [wardId]);

	return {
		dashboardData: reports, // Return transformed reports directly
		reports: reports.filter(r => r.ward_id === wardId),
		reportStats,
		loading,
		error,
	};
};