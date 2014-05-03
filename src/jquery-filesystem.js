/**
 * @author Jerome Morino
 * @created 2014-04-14
 */

// Dependencies
if (! jQuery) throw new Error('Dependency failure: unable to find jQuery framework');


(function($, undefined) {

	
	
	//=============================================================================
	//=========================== Attributes ======================================
	//=============================================================================

	
	//=============================================================================
	//=========================== Constructor =====================================
	//=============================================================================

	
	/**
	 * Constructor for a new jQuery.fs.
	 * 
	 * @class
	 * <p>This class provides jQuery wrapping features for W3C's FileSystem API</p> 
	 *
	 * @constructor
	 * @param {string} sDBName name of the database
	 * @param {string} sRemoteIDPath a path to server's ID in object properties (mandatory to create index)
	 * 
	 * @name jQuery.fs
	 */
	var oFS = $.fs = function() {
		
		if (! window.requestFileSystem) throw new Error('browser does not support FileSystem API');
	};
	
	
	//=============================================================================
	//=========================== Constants =======================================
	//=============================================================================

	
	/**
	 * Constant for requesting temporary filesystem
	 * @name jQuery.fs.TEMPORARY
	 */
	oFS.TEMPORARY = 0;
	
	/**
	 * Constant for requesting persistent filesystem
	 * @name jQuery.fs.PERSISTENT
	 */
	oFS.PERSISTENT = 1;
	
	//=================================================================================================================

	
	/**
	 * Constant for KiloByte
	 * @name jQuery.fs.KB
	 */
	oFS.KB = 1024;
	
	/**
	 * Constant for MegaByte
	 * @name jQuery.fs.MB
	 */
	oFS.MB = 1024 * oFS.KB;
	
	
	//=============================================================================
	//=========================== Methods =========================================
	//=============================================================================
	
	
	/**
	 * Requests a filesystem in which to store application data.
	 * 
	 * @function
	 * @name jQuery.fs#requestFS
	 * @return {jQuery.Deferred} a request object containing the result {@link jQuery.fs.FileSystem} object in case of success
	 */
	oFS.prototype.requestFS = function(eType, iSize) {
		
		var oDef = $.Deferred();
		window.requestFileSystem(eType, iSize,
			(function(oD, oFileSystem) { oD.resolve(new $.fs.FileSystem(oFileSystem)); }).bind(null, oDef),
			$.fs._fnErrorCallback(oDef));
		
		return oDef;
	};
	
	//=================================================================================================================

	
	/**
	 * Allows the user to look up the Entry for a file or directory referred to by a local URL.
	 * 
	 * @function
	 * @name jQuery.fs#resolveURL
	 * @param {string} sURL the URL of the file or directory to look up within the local file system
	 * @return {jQuery.Deferred} a request object containing the result {@link jQuery.fs.Entry} object in case of success
	 */
	oFS.prototype.resolveURL = function(sUrl) {
		
		var oDef = $.Deferred();
		window.resolveLocalFileSystemURL(sUrl,
			$.fs._fnEntryCallback(oDef),
			$.fs._fnErrorCallback(oDef));
		
		return oDef;
	};
	
	//=================================================================================================================

	
	oFS._fnEntryCallback = function(oDef, oFileSystem) {
		
		return (function(oD, oInternFS, oEntry) {
			oD.resolve(new $.fs[oEntry.isDirectory ? 'DirectoryEntry' : 'FileEntry'](oEntry, oInternFS));
		}).bind(null, oDef, oFileSystem);
		
	};
	
	//=================================================================================================================

	
	oFS._fnErrorCallback = function(oDef) {
		
		return oDef.reject;
	};
	

	//=============================================================================
	//=========================== Interface FileSystem ============================
	//=============================================================================

	
	/**
	 * Constructor for a new jQuery.fs.FileSystem.
	 * 
	 * @class
	 * <p>This class provides jQuery wrapping features for FileSystem interface</p> 
	 *
	 * @constructor
	 * @param {FileSystem} oFileSystem native <code>FileSystem</code> reference
	 * 
	 * @name jQuery.fs.FileSystem
	 * 
	 * @property {string} name Name of this FileSystem object
	 * @property {jQuery.fs.DirectoryEntry} root Root of this FileSystem object
	 */
	oFS.FileSystem = function(oFileSystem) {
		
		this._fs = oFileSystem;
		
		this.name = oFileSystem.name;
		this.root = new $.fs.DirectoryEntry(oFileSystem.root, this);
	};

	
	//=============================================================================
	//=========================== Interface Entry =================================
	//=============================================================================

	
	/**
	 * Constructor for a new jQuery.fs.Entry.
	 * 
	 * @class
	 * <p>This class provides jQuery wrapping features for Entry interface</p> 
	 *
	 * @constructor
	 * @param {Entry} oEntry native <code>Entry</code> reference
	 * @param {jQuery.fs.FileSystem} [oFileSystem] optional reference to <code>FileSystem</code> object. if not provided, a new wrapper object of native FileSystem reference is created 
	 * 
	 * @name jQuery.fs.Entry
	 * 
	 * @property {boolean} isFile Entry is a file.
	 * @property {boolean} isDirectory Entry is a directory.
	 * @property {string} name The name of the entry, excluding the path leading to it.
	 * @property {string} fullPath The full absolute path from the root to the entry.
	 * @property {jQuery.fs.FileSystem} fileSystem The file system on which the entry resides.
	 */
	var IEntry = oFS.Entry = function(oEntry, oFileSystem) {
		
		this._entry = oEntry;
		
		this.isFile = oEntry.isFile;
		this.isDirectory = oEntry.isDirectory;
		this.name = oEntry.name;
		this.fullPath = oEntry.fullPath;
		this.fileSystem = oFileSystem || new $.fs.FileSystem(oEntry.fileSystem);
	};

	//=================================================================================================================
	
	/**
	 * Look up metadata about this entry.
	 * 
	 * @function
	 * @name jQuery.fs.Entry#getMetaData
	 * @return {jQuery.Deferred} a request object containing the result Metadata object in case of success
	 */
	IEntry.prototype.getMetaData = function() {
		
		var oDef = $.Deferred();
		this._entry.getMetadata(oDef.resolve, $.fs._fnErrorCallback(oDef));
		
		return oDef;
	};

	//=================================================================================================================

	
	/**
	 * Look up the parent DirectoryEntry containing this Entry. 
	 * If this Entry is the root of its filesystem, its parent is itself.
	 * 
	 * @function
	 * @name jQuery.fs.Entry#getParent
	 * @return {jQuery.Deferred} a request object containing the result {@link jQuery.fs.DirectoryEntry} object in case of success
	 */
	IEntry.prototype.getParent = function() {
		
		var oDef = $.Deferred();
		
		if (this._entry.fileSystem.root === this._entry)
			oDef.resolve(this);
		else {
			this._entry.getParent(
				$.fs._fnEntryCallback(oDef, this.fileSystem),
				$.fs._fnErrorCallback(oDef));
		}
		
		return oDef;
	};

	//=================================================================================================================

	
	/**
	 * Copy an entry to a different location on the file system.
	 * 
	 * @function
	 * @name jQuery.fs.Entry#copyTo
	 * @param {jQuery.fs.DirectoryEntry} oParent directory where the {@link jQuery.fs.Entry} should be copied to
	 * @param {string} sNewName new name of the copied {@link jQuery.fs.Entry}. Default is its original name.
	 * @return {jQuery.Deferred} a request object containing the result {@link jQuery.fs.Entry} object in case of success
	 */
	IEntry.prototype.copyTo = function(oParent, sNewName) {
		
		var oDef = $.Deferred();
		this._entry.copyTo(oParent._entry, sNewName,
			$.fs._fnEntryCallback(oDef, oParent.fileSystem),
			$.fs._fnErrorCallback(oDef));
		
		return oDef;
	};

	//=================================================================================================================

	
	/**
	 * Move an entry to a different location on the file system.
	 * 
	 * @function
	 * @name jQuery.fs.Entry#moveTo
	 * @param {jQuery.fs.DirectoryEntry} oParent directory where the {@link jQuery.fs.Entry} should be moved to
	 * @param {string} sNewName new name of the copied {@link jQuery.fs.Entry}. Default is its original name.
	 * @return {jQuery.Deferred} a request object containing the result {@link jQuery.fs.Entry} object in case of success
	 */
	IEntry.prototype.moveTo = function(oParent, sNewName) {
		
		var oDef = $.Deferred();
		this._entry.moveTo(oParent._entry, sNewName,
			$.fs._fnEntryCallback(oDef, oParent.fileSystem),
			$.fs._fnErrorCallback(oDef));
		
		return oDef;
	};

	//=================================================================================================================

	
	/**
	 * Deletes a file or directory.
	 * 
	 * @function
	 * @name jQuery.fs.Entry#remove
	 * @return {jQuery.Deferred} the request object
	 */
	IEntry.prototype.remove = function() {
		
		var oDef = $.Deferred();
		this._entry.remove(
			oDef.resolve,
			$.fs._fnErrorCallback(oDef));
		
		return oDef;
	};
	
	
	//=============================================================================
	//=========================== Interface DirectoryEntry ========================
	//=============================================================================

	
	
	/**
	 * Constructor for a new jQuery.fs.DirectoryEntry.
	 * 
	 * @class
	 * <p>This class provides jQuery wrapping features for DirectoryEntry interface</p> 
	 *
	 * @extends jQuery.fs.Entry
	 * 
	 * @constructor
	 * @param {Entry} oEntry native <code>Entry</code> reference
	 * @param {jQuery.fs.FileSystem} [oFileSystem] optional reference to <code>FileSystem</code> object. if not provided, a new wrapper object of native FileSystem reference is created 
	 * 
	 * @name jQuery.fs.DirectoryEntry
	 */
	var IDEntry = oFS.DirectoryEntry = function(oEntry, oFileSystem) {
		
		// super()
		$.fs.Entry.apply(this, arguments);
	};

	
	/*
	 * Inheritance from $.fs.Entry
	 */
	IDEntry.prototype = Object.create(oFS.Entry.prototype);
	IDEntry.prototype.constructor = IDEntry;
	
	//=================================================================================================================
	
	
	/**
	 * Looks up a file.
	 * 
	 * @function
	 * @name jQuery.fs.DirectoryEntry#getFile
	 * @param {string} sPath either an absolute path or a relative path from this directory to the file to be looked up
	 * @param {boolean} bCreateIfNotExists whether the looked up file should be created if it does not exist, or not
	 * @return {jQuery.Deferred} a request object containing the result {@link jQuery.fs.FileEntry} object in case of success
	 */
	IDEntry.prototype.getFile = function(sPath, bCreateIfNotExists) {
		
		var oDef = $.Deferred();
		
		this._entry.getFile(sPath, { create : !!bCreateIfNotExists },
			$.fs._fnEntryCallback(oDef, this.fileSystem),
			$.fs._fnErrorCallback(oDef));
		
		return oDef;
	};

	//=================================================================================================================
	
	
	/**
	 * Looks up a directory.
	 * 
	 * @function
	 * @name jQuery.fs.DirectoryEntry#getDirectory
	 * @param {string} sPath either an absolute path or a relative path from this directory to the directory to be looked up
	 * @param {boolean} bCreateIfNotExists whether the looked up directory should be created if it does not exist, or not
	 * @return {jQuery.Deferred} a request object containing the result {@link jQuery.fs.DirectoryEntry} object in case of success
	 */
	IDEntry.prototype.getDirectory = function(sPath, bCreateIfNotExists) {
		
		var oDef = $.Deferred();
		
		this._entry.getDirectory(sPath, { create : !!bCreateIfNotExists },
			$.fs._fnEntryCallback(oDef, this.fileSystem),
			$.fs._fnErrorCallback(oDef));
		
		return oDef;
	};

	//=================================================================================================================
	
	
	/**
	 * Creates a file.
	 * 
	 * @function
	 * @name jQuery.fs.DirectoryEntry#createFile
	 * @param {string} sPath either an absolute path or a relative path from this directory to the file to be created
	 * @return {jQuery.Deferred} a request object containing the result {@link jQuery.fs.FileEntry} object in case of success
	 */
	IDEntry.prototype.createFile = function(sPath) {
		
		var oDef = $.Deferred();
		
		this._entry.getFile(sPath, { create : true, exclusive : true },
			$.fs._fnEntryCallback(oDef, this.fileSystem),
			$.fs._fnErrorCallback(oDef));
		
		return oDef;
	};

	//=================================================================================================================
	
	
	/**
	 * Creates a directory.
	 * 
	 * @function
	 * @name jQuery.fs.DirectoryEntry#createDirectory
	 * @param {string} sPath either an absolute path or a relative path from this directory to the directory to be created
	 * @return {jQuery.Deferred} a request object containing the result {@link jQuery.fs.DirectoryEntry} object in case of success
	 */
	IDEntry.prototype.createDirectory = function(sPath) {
		
		var oDef = $.Deferred();
		
		this._entry.getDirectory(sPath, { create : true, exclusive : true },
			$.fs._fnEntryCallback(oDef, this.fileSystem),
			$.fs._fnErrorCallback(oDef));
		
		return oDef;
	};

	//=================================================================================================================

	
	/**
	 * Deletes a directory and all of its contents, if any.
	 * 
	 * @function
	 * @name jQuery.fs.DirectoryEntry#removeRecursively
	 * @return {jQuery.Deferred} a request object
	 */
	IDEntry.prototype.removeRecursively = function() {
		
		var oDef = $.Deferred();
		this._entry.removeRecursively(
			oDef.resolve,
			$.fs._fnErrorCallback(oDef));
		
		return oDef;
	};

	//=================================================================================================================

	
	/**
	 * Lists files and directories in a directory.
	 * 
	 * @function
	 * @name jQuery.fs.DirectoryEntry#listContent
	 * @return {jQuery.Deferred} a request object containing the result {@link jQuery.fs.Entry[]} array in case of success
	 */
	IDEntry.prototype.listContent = function() {
		
		var oDef = $.Deferred(),
			oReader = new $.fs.DirectoryReader(this._entry.createReader()),
			
			aDirContent = [],
		
			// define recursive function to read all content
			fnReadBlock = function(oD, oReader, aContent) {
			
				oReader.readEntries()
					.done((function(oDeferred, oReader, aList, aResults) {
						
						var i = 0, len = aResults.length;
						
						for ( ; i < len ; ++i) aList.push(aResults[i]);
						
						if (len) {
							// fetch next block
							fnReadBlock(oDeferred, oReader, aList);
						} else {
							// end of content reading
							oDeferred.resolve(aList);
						}
						
					}).bind(this, oD, oReader, aContent))
					.fail($.fs._fnErrorCallback(oD));
			};
		
		
		// start reading content
		fnReadBlock(oDef, oReader, aDirContent);
		
		return oDef;
	};
	
	
	//=============================================================================
	//=========================== Interface DirectoryReader =======================
	//=============================================================================
	
	
	/**
	 * Constructor for a new jQuery.fs.DirectoryReader.
	 * 
	 * @class
	 * <p>This class provides jQuery wrapping features for DirectoryReader interface</p> 
	 *
	 * @constructor
	 * @param {DirectoryReader} oDReader native <code>DirectoryReader</code> reference
	 * 
	 * @name jQuery.fs.DirectoryReader
	 */
	var IDReader = oFS.DirectoryReader = function(oDReader) {
		
		this._reader = oDReader;
	};

	//=================================================================================================================
	
	
	/**
	 * Read the next block of entries from this directory.
	 * 
	 * @function
	 * @name jQuery.fs.DirectoryReader#readEntries
	 * @return {jQuery.Deferred} a request object containing the result {@link jQuery.fs.Entry[]} array in case of success
	 */
	IDReader.prototype.readEntries = function() {
		
		var oDef = $.Deferred();
		
		this._reader.readEntries(oDef.resolve, oDef.reject);
		
		return oDef;
	};
	
	
	//=============================================================================
	//=========================== Interface FileEntry =============================
	//=============================================================================

	
	/**
	 * Constructor for a new jQuery.fs.FileEntry.
	 * 
	 * @class
	 * <p>This class provides jQuery wrapping features for FileEntry interface</p> 
	 *
	 * @extends jQuery.fs.Entry
	 * 
	 * @constructor
	 * @param {Entry} oEntry native <code>Entry</code> reference
	 * @param {jQuery.fs.FileSystem} [oFileSystem] optional reference to <code>FileSystem</code> object. if not provided, a new wrapper object of native FileSystem reference is created 
	 * 
	 * @name jQuery.fs.FileEntry
	 */
	var IFEntry = oFS.FileEntry = function(oEntry, oFileSystem) {
		
		// super()
		$.fs.Entry.apply(this, arguments);
	};


	/*
	 * Inheritance from $.fs.Entry
	 */
	IFEntry.prototype = Object.create(oFS.Entry.prototype);
	IFEntry.prototype.constructor = IFEntry;

	//=================================================================================================================
	
	
	/**
	 * Creates a new FileWriter associated with the file that this FileEntry represents.
	 * 
	 * @function
	 * @name jQuery.fs.FileEntry#createWriter
	 * @return {jQuery.Deferred} a request object containing the result {@link FileWriter} object in case of success
	 */
	IFEntry.prototype.createWriter = function() {
		
		var oDef = $.Deferred();
		
		this._entry.createWriter(
			oDef.resolve,
			$.fs._fnErrorCallback(oDef));
		
		return oDef;
	};

	//=================================================================================================================
	
	
	/**
	 * Returns a <code>File</code> that represents the current state of the file that this FileEntry represents.
	 * 
	 * @function
	 * @name jQuery.fs.FileEntry#asFile
	 * @return {jQuery.Deferred} a request object containing the result {@link jQuery.fs.File} object in case of success
	 */
	IFEntry.prototype.asFile = function() {
		
		var oDef = $.Deferred();
		
		this._entry.file(
			oDef.resolve,
			$.fs._fnErrorCallback(oDef));
		
		return oDef;
	};
	
	
	//=============================================================================
	//=========================== Helpers =========================================
	//=============================================================================
	
	
	
})(jQuery);